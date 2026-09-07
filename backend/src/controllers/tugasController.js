import pool from '../db/pool.js';
import * as Semester from '../utils/semester.js';
import * as ActivityLog from '../utils/activityLog.js';
import * as NotificationService from '../services/notificationService.js';
import { buildPaginationResponse } from '../utils/paginate.js';
import { classifyFileType, uploadToSupabase, fileUrl } from '../middleware/upload.js';

export async function index(req, res) {
  const user = req.user;
  const { periode_id: periodeId, semester } = await Semester.fromRequest(req);

  const params = [];
  const conditions = [];

  if (periodeId) {
    params.push(periodeId);
    conditions.push(`t.periode_id = $${params.length}`);
  } else {
    conditions.push('1=0');
  }

  if (semester === 1 || semester === 2) {
    const tahun = await Semester.periodeTahun(periodeId);
    if (tahun) {
      const [awalSemester, akhirSemester] = Semester.rentang(tahun, semester);
      params.push(awalSemester, akhirSemester);
      const i1 = params.length - 1;
      const i2 = params.length;
      conditions.push(`(t.created_at BETWEEN $${i1} AND $${i2} OR EXISTS (
        SELECT 1 FROM subtugas s2 JOIN subtugas_updates su2 ON su2.subtugas_id = s2.id
        WHERE s2.tugas_id = t.id AND su2.created_at BETWEEN $${i1} AND $${i2}
      ))`);
    }
  }

  if (user.role === 'katim') {
    params.push(user.id);
    conditions.push(`(t.team_id IS NULL OR EXISTS (SELECT 1 FROM teams tm WHERE tm.id = t.team_id AND tm.katim_id = $${params.length}))`);
  } else if (user.role === 'anggota') {
    params.push(user.id);
    conditions.push(`EXISTS (SELECT 1 FROM subtugas s3 WHERE s3.tugas_id = t.id AND s3.assigned_to = $${params.length})`);
  }

  if (req.query.status) {
    params.push(req.query.status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (req.query.team_id) {
    params.push(req.query.team_id);
    conditions.push(`t.team_id = $${params.length}`);
  }
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    conditions.push(`(t.judul ILIKE $${params.length} OR t.deskripsi ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const page = Math.max(Number(req.query.page || 1), 1);
  const perPage = 15;
  const offset = (page - 1) * perPage;

  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM tugas t ${where}`, params);

  const dataParams = [...params, perPage, offset];
  const { rows } = await pool.query(
    `SELECT t.*,
        (SELECT COUNT(*)::int FROM subtugas s WHERE s.tugas_id = t.id) AS subtugas_count,
        CASE WHEN tm.id IS NOT NULL THEN
          json_build_object(
            'id', tm.id, 'nama_tim', tm.nama_tim, 'kode_tim', tm.kode_tim, 'katim_id', tm.katim_id,
            'katim', json_build_object('id', k.id, 'name', k.name)
          )
        ELSE NULL END AS team,
        json_build_object('id', c.id, 'name', c.name) AS creator,
        json_build_object('id', p.id, 'tahun', p.tahun, 'status', p.status) AS periode
     FROM tugas t
     LEFT JOIN teams tm ON tm.id = t.team_id
     LEFT JOIN users k ON k.id = tm.katim_id
     JOIN users c ON c.id = t.created_by
     JOIN periodes p ON p.id = t.periode_id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return res.json(
    buildPaginationResponse({
      data: rows,
      total: countRows[0].total,
      page,
      perPage,
      path: '/api/tugas',
    })
  );
}

export async function store(req, res) {
  const { judul, deskripsi = null, deadline = null, periode_id = null, team_id } = req.body || {};

  if (!judul) {
    return res.status(422).json({ message: 'Judul tugas wajib diisi.' });
  }

  let finalPeriodeId = periode_id;
  if (!finalPeriodeId) {
    const aktif = await Semester.periodeAktifSaatIni();
    finalPeriodeId = aktif?.id ?? null;
  }

  if (!finalPeriodeId) {
    return res.status(422).json({
      message: 'Belum ada periode aktif. Minta Kabalai membuka periode/tahun anggaran terlebih dahulu.',
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO tugas (judul, deskripsi, periode_id, deadline, team_id, created_by, status, progress)
       VALUES ($1,$2,$3,$4,$5,$6,'Belum Dimulai',0) RETURNING *`,
      [judul, deskripsi || null, finalPeriodeId, deadline || null, team_id || null, req.user.id]
    );
    const tugas = rows[0];

    if (tugas.team_id) {
      const { rows: teamRows } = await pool.query(`SELECT * FROM teams WHERE id = $1`, [tugas.team_id]);
      const team = teamRows[0];

      if (team?.katim_id) {
        await NotificationService.kirim(
          team.katim_id,
          'Tugas baru diterima',
          `Tim Anda (${team.nama_tim}) mendapat tugas baru: ${tugas.judul}`,
          `/katim/tugas/${tugas.id}`
        );
      }
    }

    await ActivityLog.catat(req.user.id, `membuat tugas ${tugas.judul}`, 'tugas', tugas.id);

    return res.status(201).json(tugas);
  } catch (error) {
    return res.status(500).json({ message: "Kesalahan database: " + error.message });
  }
}

export async function show(req, res) {
  const tugasId = req.params.tugas;

  const { rows: tugasRows } = await pool.query(
    `SELECT t.*,
        CASE WHEN tm.id IS NOT NULL THEN
          json_build_object(
            'id', tm.id, 'nama_tim', tm.nama_tim, 'kode_tim', tm.kode_tim, 'katim_id', tm.katim_id,
            'katim', json_build_object('id', k.id, 'name', k.name, 'jabatan', k.jabatan, 'foto', k.foto),
            'members', COALESCE((
              SELECT json_agg(json_build_object('id', mu.id, 'name', mu.name))
              FROM team_members mem JOIN users mu ON mu.id = mem.user_id WHERE mem.team_id = tm.id
            ), '[]'::json)
          )
        ELSE NULL END AS team,
        json_build_object('id', c.id, 'name', c.name) AS creator,
        CASE WHEN vf.id IS NOT NULL THEN json_build_object('id', vf.id, 'name', vf.name) ELSE NULL END AS verifikator
     FROM tugas t
     LEFT JOIN teams tm ON tm.id = t.team_id
     LEFT JOIN users k ON k.id = tm.katim_id
     JOIN users c ON c.id = t.created_by
     LEFT JOIN users vf ON vf.id = t.verifikasi_by
     WHERE t.id = $1`,
    [tugasId]
  );

  const tugas = tugasRows[0];
  if (!tugas) {
    return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
  }

  // BACA SIAPA YANG SEDANG LOGIN: Jika Katim, berikan juga daftar anggota timnya
  // agar Katim bisa assign anggotanya sendiri di Tugas Umum
  if (req.user.role === 'katim') {
    const { rows: myTeamRows } = await pool.query(
      `SELECT COALESCE(json_agg(json_build_object('id', mu.id, 'name', mu.name)), '[]'::json) as members
       FROM teams tm
       JOIN team_members mem ON mem.team_id = tm.id
       JOIN users mu ON mu.id = mem.user_id
       WHERE tm.katim_id = $1`,
      [req.user.id]
    );
    tugas.my_team_members = myTeamRows[0]?.members || [];
  }

  const { rows: subtugasRows } = await pool.query(
    `SELECT s.*,
        (s.verifikasi_katim_status = 'disetujui' OR s.verifikasi_kasubag_status = 'disetujui') AS locked,
        json_build_object('id', a.id, 'name', a.name, 'jabatan', a.jabatan, 'foto', a.foto) AS assignee,
        CASE WHEN vk.id IS NOT NULL THEN json_build_object('id', vk.id, 'name', vk.name) ELSE NULL END AS "verifikatorKatim",
        CASE WHEN vs.id IS NOT NULL THEN json_build_object('id', vs.id, 'name', vs.name) ELSE NULL END AS "verifikatorKasubag"
     FROM subtugas s
     JOIN users a ON a.id = s.assigned_to
     LEFT JOIN users vk ON vk.id = s.verifikasi_katim_by
     LEFT JOIN users vs ON vs.id = s.verifikasi_kasubag_by
     WHERE s.tugas_id = $1
     ORDER BY s.created_at DESC`,
    [tugasId]
  );

  for (const s of subtugasRows) {
    // ambil lampiran yang nempel langsung di subtugas (upload dari Katim/Kasubag)
    const { rows: subFileRows } = await pool.query(
      `SELECT * FROM subtugas_files WHERE subtugas_id = $1`,
      [s.id]
    );
    s.files = subFileRows.map((f) => ({ ...f, url: fileUrl(req, f.file_path) }));

    const { rows: updateRows } = await pool.query(
      `SELECT su.*, json_build_object('id', u.id, 'name', u.name) AS user
      FROM subtugas_updates su JOIN users u ON u.id = su.user_id
      WHERE su.subtugas_id = $1 ORDER BY su.created_at DESC`,
      [s.id]
    );
    for (const upd of updateRows) {
      const { rows: fileRows } = await pool.query(
        `SELECT * FROM subtugas_files WHERE subtugas_update_id = $1`,
        [upd.id]
      );
      upd.files = fileRows.map((f) => ({ ...f, url: fileUrl(req, f.file_path) }));
    }
    s.updates = updateRows;
  }

  const { rows: files } = await pool.query(`SELECT * FROM subtugas_files WHERE tugas_id = $1`, [tugasId]);
  tugas.files = files.map((f) => ({ ...f, url: fileUrl(req, f.file_path) }));

  const { rows: comments } = await pool.query(
    `SELECT c.*, json_build_object('id', u.id, 'name', u.name, 'role', u.role) AS user
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.tugas_id = $1 ORDER BY c.created_at ASC`,
    [tugasId]
  );

  tugas.subtugas = subtugasRows;
  tugas.comments = comments;

  return res.json(tugas);
}

export async function update(req, res) {
  const tugasId = req.params.tugas;
  const { judul, deskripsi, deadline } = req.body || {};

  const fields = {};
  if (typeof judul !== 'undefined') fields.judul = judul;
  if (typeof deskripsi !== 'undefined') fields.deskripsi = deskripsi || null;
  if (typeof deadline !== 'undefined') fields.deadline = deadline || null;

  const keys = Object.keys(fields);
  if (keys.length === 0) {
    const { rows } = await pool.query(`SELECT * FROM tugas WHERE id = $1`, [tugasId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
    return res.json(rows[0]);
  }

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => fields[k]);
  values.push(tugasId);

  const { rows } = await pool.query(
    `UPDATE tugas SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });

  await ActivityLog.catat(req.user.id, `mengubah tugas ${rows[0].judul}`, 'tugas', rows[0].id);

  return res.json(rows[0]);
}

export async function destroy(req, res) {
  await pool.query(`DELETE FROM tugas WHERE id = $1`, [req.params.tugas]);
  return res.json({ message: 'Tugas dihapus.' });
}

export async function verifikasi(req, res) {
  const tugasId = req.params.tugas;
  const { keputusan, catatan = null } = req.body || {};

  if (!['disetujui', 'ditolak'].includes(keputusan)) {
    return res.status(422).json({ message: 'Keputusan tidak valid.' });
  }

  const { rows } = await pool.query(
    `UPDATE tugas SET verifikasi_status = $1, verifikasi_by = $2, verifikasi_at = now(),
        verifikasi_catatan = $3, status = $4, updated_at = now()
     WHERE id = $5 RETURNING *`,
    [keputusan, req.user.id, catatan, keputusan === 'disetujui' ? 'Selesai' : 'Sedang Berjalan', tugasId]
  );

  const tugas = rows[0];
  if (!tugas) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });

  if (tugas.team_id) {
    const { rows: teamRows } = await pool.query(`SELECT * FROM teams WHERE id = $1`, [tugas.team_id]);
    const team = teamRows[0];

    if (team && team.katim_id) {
      await NotificationService.kirim(
        team.katim_id,
        keputusan === 'disetujui' ? 'Tugas terverifikasi' : 'Tugas dikembalikan',
        `Tugas '${tugas.judul}' telah ${keputusan} oleh kasubag.` + (catatan ? ` Catatan: ${catatan}` : ''),
        `/katim/tugas/${tugas.id}`
      );
    }
  }

  await ActivityLog.catat(req.user.id, `verifikasi tugas ${tugas.judul} (${keputusan})`, 'tugas', tugas.id);

  return res.json(tugas);
}

export async function duplicate(req, res) {
  const tugasId = req.params.tugas;
  const { periode_id, team_id = null, salin_subtugas = true } = req.body || {};

  if (!periode_id) {
    return res.status(422).json({ message: 'Periode tujuan wajib diisi.' });
  }

  const { rows: tugasRows } = await pool.query(`SELECT * FROM tugas WHERE id = $1`, [tugasId]);
  const tugas = tugasRows[0];
  if (!tugas) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });

  if (Number(periode_id) === Number(tugas.periode_id)) {
    return res.status(422).json({
      message:
        'Tugas ini sudah berada di periode tersebut. Progres berlanjut otomatis di semester berikutnya tanpa perlu duplikasi.',
    });
  }

  const { rows: baruRows } = await pool.query(
    `INSERT INTO tugas (judul, deskripsi, periode_id, deadline, status, progress, created_by, team_id, duplicated_from_id)
     VALUES ($1,$2,$3,NULL,'Belum Dimulai',0,$4,$5,$6) RETURNING *`,
    [tugas.judul, tugas.deskripsi, periode_id, req.user.id, team_id || tugas.team_id || null, tugas.id]
  );
  const baru = baruRows[0];

  if (salin_subtugas) {
    const { rows: subtugasList } = await pool.query(`SELECT * FROM subtugas WHERE tugas_id = $1`, [
      tugas.id,
    ]);
    for (const s of subtugasList) {
      await pool.query(
        `INSERT INTO subtugas (tugas_id, judul, deskripsi, assigned_to, deadline, progress, status, created_by)
         VALUES ($1,$2,$3,$4,NULL,0,'Belum Dimulai',$5)`,
        [baru.id, s.judul, s.deskripsi, s.assigned_to, req.user.id]
      );
    }
  }

  const { rows: periodeRows } = await pool.query(`SELECT tahun FROM periodes WHERE id = $1`, [
    baru.periode_id,
  ]);

  await ActivityLog.catat(
    req.user.id,
    `menduplikasi tugas ${tugas.judul} ke periode tahun ${periodeRows[0]?.tahun}`,
    'tugas',
    baru.id
  );

  const { rows: subtugasBaru } = await pool.query(`SELECT * FROM subtugas WHERE tugas_id = $1`, [baru.id]);
  baru.subtugas = subtugasBaru;

  return res.status(201).json(baru);
}

export async function uploadLampiran(req, res) {
  if (!req.file) {
    return res.status(422).json({ message: 'File wajib diunggah.' });
  }

  const tugasId = req.params.tugas;
  const { url } = await uploadToSupabase(req.file, 'lampiran-tugas');
  const type = classifyFileType(req.file.originalname);

  const { rows } = await pool.query(
    `INSERT INTO subtugas_files (tugas_id, file_path, file_name, file_type, keterangan, uploaded_at)
     VALUES ($1,$2,$3,$4,$5,now()) RETURNING *`,
    [tugasId, url, req.file.originalname, type, req.body?.keterangan || null]
  );

  return res.status(201).json({ ...rows[0], url: fileUrl(req, url) });
}