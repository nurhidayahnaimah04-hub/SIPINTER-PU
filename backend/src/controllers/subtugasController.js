import pool from '../db/pool.js';
import * as Semester from '../utils/semester.js';
import * as ActivityLog from '../utils/activityLog.js';
import * as NotificationService from '../services/notificationService.js';
import { recalculateProgress } from '../utils/tugasHelper.js';
import { classifyFileType, uploadToSupabase, fileUrl } from '../middleware/upload.js';

export async function index(req, res) {
  const user = req.user;
  const { periode_id: periodeId, semester } = await Semester.fromRequest(req);

  const params = [user.id];
  const conditions = [`s.assigned_to = $1`];

  if (periodeId) {
    params.push(periodeId);
    conditions.push(`t.periode_id = $${params.length}`);
  } else {
    conditions.push('1=0');
  }

  if (semester === 1 || semester === 2) {
    const tahun = await Semester.periodeTahun(periodeId);
    if (tahun) {
      const [awal, akhir] = Semester.rentang(tahun, semester);
      params.push(awal, akhir);
      const i1 = params.length - 1;
      const i2 = params.length;
      conditions.push(`(s.created_at BETWEEN $${i1} AND $${i2} OR EXISTS (
        SELECT 1 FROM subtugas_updates su WHERE su.subtugas_id = s.id AND su.created_at BETWEEN $${i1} AND $${i2}
      ))`);
    }
  }

  if (req.query.status) {
    params.push(req.query.status);
    conditions.push(`s.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT s.*,
        json_build_object('id', t.id, 'judul', t.judul, 'team_id', t.team_id, 'periode_id', t.periode_id) AS tugas,
        json_build_object('id', a.id, 'name', a.name) AS assignee
     FROM subtugas s
     JOIN tugas t ON t.id = s.tugas_id
     JOIN users a ON a.id = s.assigned_to
     ${where}
     ORDER BY s.created_at DESC`,
    params
  );

  return res.json(rows);
}

export async function show(req, res) {
  const subtugasId = req.params.subtugas;

  const { rows } = await pool.query(
    `SELECT s.*,
        (s.verifikasi_katim_status = 'disetujui' OR s.verifikasi_kasubag_status = 'disetujui') AS locked,
        json_build_object(
          'id', t.id, 'judul', t.judul, 'team_id', t.team_id,
          'team', CASE WHEN tm.id IS NOT NULL THEN json_build_object('id', tm.id, 'nama_tim', tm.nama_tim, 'kode_tim', tm.kode_tim, 'katim_id', tm.katim_id) ELSE NULL END
        ) AS tugas,
        json_build_object('id', a.id, 'name', a.name, 'jabatan', a.jabatan, 'foto', a.foto, 'email', a.email) AS assignee,
        json_build_object('id', c.id, 'name', c.name) AS creator,
        CASE WHEN vk.id IS NOT NULL THEN json_build_object('id', vk.id, 'name', vk.name) ELSE NULL END AS "verifikatorKatim",
        CASE WHEN vs.id IS NOT NULL THEN json_build_object('id', vs.id, 'name', vs.name) ELSE NULL END AS "verifikatorKasubag"
     FROM subtugas s
     JOIN tugas t ON t.id = s.tugas_id
     LEFT JOIN teams tm ON tm.id = t.team_id
     JOIN users a ON a.id = s.assigned_to
     JOIN users c ON c.id = s.created_by
     LEFT JOIN users vk ON vk.id = s.verifikasi_katim_by
     LEFT JOIN users vs ON vs.id = s.verifikasi_kasubag_by
     WHERE s.id = $1`,
    [subtugasId]
  );

  const subtugas = rows[0];
  if (!subtugas) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });

  // Ambil file yang terikat LANGSUNG ke subtugas (Lampiran dari Katim/Kasubag)
  const { rows: subFiles } = await pool.query(
    `SELECT * FROM subtugas_files WHERE subtugas_id = $1`,
    [subtugasId]
  );
  subtugas.files = subFiles.map(f => ({ ...f, url: fileUrl(req, f.file_path) }));

  // Ambil file yang terikat pada update (Progres dari Anggota)
  const { rows: updateRows } = await pool.query(
    `SELECT su.*, json_build_object('id', u.id, 'name', u.name) AS user
     FROM subtugas_updates su JOIN users u ON u.id = su.user_id
     WHERE su.subtugas_id = $1 ORDER BY su.created_at DESC`,
    [subtugasId]
  );
  
  for (const upd of updateRows) {
    const { rows: fileRows } = await pool.query(
      `SELECT * FROM subtugas_files WHERE subtugas_update_id = $1`,
      [upd.id]
    );
    upd.files = fileRows.map((f) => ({ ...f, url: fileUrl(req, f.file_path) }));
  }
  subtugas.updates = updateRows;

  const { rows: comments } = await pool.query(
    `SELECT c.*, json_build_object('id', u.id, 'name', u.name, 'role', u.role) AS user
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.subtugas_id = $1 ORDER BY c.created_at ASC`,
    [subtugasId]
  );
  subtugas.comments = comments;

  return res.json(subtugas);
}

export async function store(req, res) {
  const tugasId = req.params.tugas;
  const { judul, deskripsi = null, assigned_to, deadline = null } = req.body || {};

  if (!judul || !assigned_to) {
    return res.status(422).json({ message: 'Data subtugas tidak lengkap.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO subtugas (tugas_id, judul, deskripsi, assigned_to, deadline, created_by, status, progress)
       VALUES ($1,$2,$3,$4,$5,$6,'Belum Dimulai',0) RETURNING *`,
      [tugasId, judul, deskripsi, assigned_to, deadline || null, req.user.id]
    );
    const subtugas = rows[0];

    const files = req.files || [];
    if (files.length > 0) {
      for (const f of files) {
        const { url } = await uploadToSupabase(f, 'lampiran-tugas'); 
        const type = classifyFileType(f.originalname);
        // Simpan langsung menggunakan subtugas_id
        await pool.query(
          `INSERT INTO subtugas_files (subtugas_id, file_path, file_name, file_type, uploaded_at)
           VALUES ($1,$2,$3,$4,now())`,
          [subtugas.id, url, f.originalname, type]
        );
      }
    }

    await recalculateProgress(tugasId);

    const deadlineStr = subtugas.deadline
      ? new Date(subtugas.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null;

    await NotificationService.kirim(
      subtugas.assigned_to,
      'Subtugas baru diterima',
      `Anda mendapat subtugas baru: ${subtugas.judul}` + (deadlineStr ? ` (deadline ${deadlineStr})` : ''),
      `/anggota/subtugas/${subtugas.id}`
    );

    await ActivityLog.catat(req.user.id, `membuat subtugas ${subtugas.judul}`, 'subtugas', subtugas.id);

    const { rows: assigneeRows } = await pool.query(`SELECT id, name FROM users WHERE id = $1`, [
      subtugas.assigned_to,
    ]);

    return res.status(201).json({ ...subtugas, assignee: assigneeRows[0] });
  } catch (error) {
    return res.status(500).json({ message: "Gagal membuat subtugas: " + error.message });
  }
}

export async function update(req, res) {
  const subtugasId = req.params.subtugas;
  const { judul, deskripsi, assigned_to, deadline } = req.body || {};

  const fields = {};
  if (typeof judul !== 'undefined') fields.judul = judul;
  if (typeof deskripsi !== 'undefined') fields.deskripsi = deskripsi || null;
  if (typeof assigned_to !== 'undefined') fields.assigned_to = assigned_to;
  if (typeof deadline !== 'undefined') fields.deadline = deadline || null;

  const keys = Object.keys(fields);
  let subtugas;

  if (keys.length === 0) {
    const { rows } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);
    subtugas = rows[0];
  } else {
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);
    values.push(subtugasId);
    const { rows } = await pool.query(
      `UPDATE subtugas SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    );
    subtugas = rows[0];
  }

  if (!subtugas) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });

  const files = req.files || [];
  if (files.length > 0) {
    for (const f of files) {
      const { url } = await uploadToSupabase(f, 'lampiran-tugas');
      const type = classifyFileType(f.originalname);
      // Simpan langsung ke subtugas_id
      await pool.query(
        `INSERT INTO subtugas_files (subtugas_id, file_path, file_name, file_type, uploaded_at)
         VALUES ($1,$2,$3,$4,now())`,
        [subtugas.id, url, f.originalname, type]
      );
    }
  }

  await recalculateProgress(subtugas.tugas_id);
  await ActivityLog.catat(req.user.id, `mengubah subtugas ${subtugas.judul}`, 'subtugas', subtugas.id);

  const { rows: fresh } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);

  return res.json(fresh[0]);
}

export async function destroy(req, res) {
  const { rows } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [req.params.subtugas]);
  const subtugas = rows[0];
  if (!subtugas) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });

  await pool.query(`DELETE FROM subtugas WHERE id = $1`, [subtugas.id]);
  await recalculateProgress(subtugas.tugas_id);

  return res.json({ message: 'Subtugas dihapus.' });
}

export async function destroyFile(req, res) {
  try {
    const { rows } = await pool.query(
      `DELETE FROM subtugas_files WHERE id = $1 RETURNING *`, 
      [req.params.fileId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'File tidak ditemukan.' });
    }
    
    return res.json({ message: 'File lampiran berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ message: 'Gagal menghapus file: ' + error.message });
  }
}