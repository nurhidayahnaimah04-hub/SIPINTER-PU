import pool from '../db/pool.js';
import * as Semester from '../utils/semester.js';
import * as ActivityLog from '../utils/activityLog.js';
import * as NotificationService from '../services/notificationService.js';
import { recalculateProgress } from '../utils/tugasHelper.js';
import { classifyFileType, uploadToSupabase, fileUrl } from '../middleware/upload.js';

// HELPER: Parser tangguh untuk mengekstrak seluruh ID anggota (Multi-Assignee)
function parseAssignees(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(Number).filter(Boolean);
  }
  if (typeof input === 'string') {
    // Jika dikirim sebagai JSON String dari FormData (misal: "[1,2,3]")
    if (input.startsWith('[')) {
      try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) return parsed.map(Number).filter(Boolean);
      } catch (e) {}
    }
    // Jika dikirim dipisah koma (misal: "1,2,3")
    return input.split(',').map(Number).filter(Boolean);
  }
  return [Number(input)].filter(Boolean);
}

export async function index(req, res) {
  const user = req.user;
  const { periode_id: periodeId, semester } = await Semester.fromRequest(req);

  const params = [user.id];
  // Cek kolom assigned_to ATAU keberadaan user di tabel perantara subtugas_assignees
  const conditions = [
    `(s.assigned_to = $1 OR EXISTS (
      SELECT 1 FROM subtugas_assignees sa WHERE sa.subtugas_id = s.id AND sa.user_id = $1
    ))`
  ];

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
        json_build_object('id', a.id, 'name', a.name) AS assignee,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', u.id, 'name', u.name))
            FROM subtugas_assignees sa
            JOIN users u ON u.id = sa.user_id
            WHERE sa.subtugas_id = s.id
          ),
          '[]'::json
        ) AS assignees
     FROM subtugas s
     JOIN tugas t ON t.id = s.tugas_id
     LEFT JOIN users a ON a.id = s.assigned_to
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
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'jabatan', u.jabatan, 'foto', u.foto, 'email', u.email))
            FROM subtugas_assignees sa
            JOIN users u ON u.id = sa.user_id
            WHERE sa.subtugas_id = s.id
          ),
          '[]'::json
        ) AS assignees,
        json_build_object('id', c.id, 'name', c.name) AS creator,
        CASE WHEN vk.id IS NOT NULL THEN json_build_object('id', vk.id, 'name', vk.name) ELSE NULL END AS "verifikatorKatim",
        CASE WHEN vs.id IS NOT NULL THEN json_build_object('id', vs.id, 'name', vs.name) ELSE NULL END AS "verifikatorKasubag"
     FROM subtugas s
     JOIN tugas t ON t.id = s.tugas_id
     LEFT JOIN teams tm ON tm.id = t.team_id
     LEFT JOIN users a ON a.id = s.assigned_to
     JOIN users c ON c.id = s.created_by
     LEFT JOIN users vk ON vk.id = s.verifikasi_katim_by
     LEFT JOIN users vs ON vs.id = s.verifikasi_kasubag_by
     WHERE s.id = $1`,
    [subtugasId]
  );

  const subtugas = rows[0];
  if (!subtugas) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });

  // Ambil file yang terikat LANGSUNG ke subtugas (Lampiran dari Katim/Kasubag/Anggota)
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
  const { judul, deskripsi = null, deadline } = req.body || {};

  // Otorisasi role: Kasubag, Katim, Anggota, & Kabalai diperbolehkan membuat subtugas
  const allowedRoles = ['kasubag', 'katim', 'anggota', 'kabalai'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk menambahkan subtugas.' });
  }

  // Parsing assigned_to secara tangguh
  const assigneesList = parseAssignees(req.body?.assigned_to);

  if (!judul || assigneesList.length === 0 || !deadline) {
    return res.status(422).json({ message: 'Data subtugas tidak lengkap (judul, pelaksana, dan deadline wajib diisi).' });
  }

  try {
    const primaryAssignee = assigneesList[0] || null;

    const { rows } = await pool.query(
      `INSERT INTO subtugas (tugas_id, judul, deskripsi, assigned_to, deadline, created_by, status, progress)
       VALUES ($1,$2,$3,$4,$5,$6,'Belum Dimulai',0) RETURNING *`,
      [tugasId, judul, deskripsi, primaryAssignee, deadline, req.user.id]
    );
    const subtugas = rows[0];

    // Simpan semua anggota ke tabel perantara subtugas_assignees
    await pool.query(`DELETE FROM subtugas_assignees WHERE subtugas_id = $1`, [subtugas.id]);
    for (const uid of assigneesList) {
      await pool.query(
        `INSERT INTO subtugas_assignees (subtugas_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [subtugas.id, uid]
      );
    }

    const files = req.files || [];
    if (files.length > 0) {
      for (const f of files) {
        const { url } = await uploadToSupabase(f, 'lampiran-tugas'); 
        const type = classifyFileType(f.originalname);
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

    // Kirim notifikasi ke SEMUA anggota yang terdaftar di checklist
    for (const uid of assigneesList) {
      await NotificationService.kirim(
        uid,
        'Subtugas baru diterima',
        `Anda mendapat subtugas baru: ${subtugas.judul}` + (deadlineStr ? ` (deadline ${deadlineStr})` : ''),
        `/anggota/subtugas/${subtugas.id}`
      );
    }

    await ActivityLog.catat(req.user.id, `membuat subtugas ${subtugas.judul}`, 'subtugas', subtugas.id);

    // Ambil data fresh beserta SELURUH array assignees untuk dikembalikan ke frontend
    const { rows: freshRows } = await pool.query(
      `SELECT s.*,
          COALESCE(
            (
              SELECT json_agg(json_build_object('id', u.id, 'name', u.name))
              FROM subtugas_assignees sa
              JOIN users u ON u.id = sa.user_id
              WHERE sa.subtugas_id = s.id
            ),
            '[]'::json
          ) AS assignees
       FROM subtugas s WHERE s.id = $1`,
      [subtugas.id]
    );

    return res.status(201).json(freshRows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Gagal membuat subtugas: " + error.message });
  }
}

export async function update(req, res) {
  const subtugasId = req.params.subtugas;
  const { judul, deskripsi, deadline } = req.body || {};

  try {
    const { rows: currentRows } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);
    if (!currentRows.length) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });
    const current = currentRows[0];

    // OTORISASI: Mengizinkan Kasubag, Katim, Anggota, & Kabalai mengedit subtugas
    const allowedRoles = ['kasubag', 'katim', 'anggota', 'kabalai'];
    if (!allowedRoles.includes(req.user.role) && current.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk mengubah subtugas ini.' });
    }

    if (typeof deadline !== 'undefined' && (!deadline || deadline === null)) {
      return res.status(422).json({ message: 'Tanggal deadline subtugas wajib diisi.' });
    }

    const fields = {};
    if (typeof judul !== 'undefined') fields.judul = judul;
    if (typeof deskripsi !== 'undefined') fields.deskripsi = deskripsi || null;
    if (typeof deadline !== 'undefined') fields.deadline = deadline;

    // Parsing assigned_to untuk Update Multi-Assignee
    let assigneesList = [];
    if (typeof req.body?.assigned_to !== 'undefined') {
      assigneesList = parseAssignees(req.body.assigned_to);
      fields.assigned_to = assigneesList[0] || null;
    }

    const keys = Object.keys(fields);
    let subtugas;

    if (keys.length === 0) {
      subtugas = current;
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

    // Update relasi pelaksana di tabel perantara subtugas_assignees
    if (typeof req.body?.assigned_to !== 'undefined') {
      await pool.query(`DELETE FROM subtugas_assignees WHERE subtugas_id = $1`, [subtugasId]);
      for (const uid of assigneesList) {
        await pool.query(
          `INSERT INTO subtugas_assignees (subtugas_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [subtugasId, uid]
        );
      }
    }

    const files = req.files || [];
    if (files.length > 0) {
      for (const f of files) {
        const { url } = await uploadToSupabase(f, 'lampiran-tugas');
        const type = classifyFileType(f.originalname);
        await pool.query(
          `INSERT INTO subtugas_files (subtugas_id, file_path, file_name, file_type, uploaded_at)
           VALUES ($1,$2,$3,$4,now())`,
          [subtugas.id, url, f.originalname, type]
        );
      }
    }

    await recalculateProgress(subtugas.tugas_id);
    await ActivityLog.catat(req.user.id, `mengubah subtugas ${subtugas.judul}`, 'subtugas', subtugas.id);

    const { rows: fresh } = await pool.query(
      `SELECT s.*,
          COALESCE(
            (
              SELECT json_agg(json_build_object('id', u.id, 'name', u.name))
              FROM subtugas_assignees sa
              JOIN users u ON u.id = sa.user_id
              WHERE sa.subtugas_id = s.id
            ),
            '[]'::json
          ) AS assignees
       FROM subtugas s WHERE s.id = $1`,
      [subtugasId]
    );

    return res.json(fresh[0]);
  } catch (error) {
    return res.status(500).json({ message: "Gagal memperbarui subtugas: " + error.message });
  }
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