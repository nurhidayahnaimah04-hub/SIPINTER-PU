import pool from '../db/pool.js';
import * as Semester from '../utils/semester.js';
import * as ActivityLog from '../utils/activityLog.js';
import * as NotificationService from '../services/notificationService.js';
import { recalculateProgress } from '../utils/tugasHelper.js';
import { classifyFileType, uploadToSupabase, fileUrl } from '../middleware/upload.js';

// HELPER: Otomatis melengkapi awalan https:// jika belum ada
function formatUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

// HELPER: Parser tangguh untuk mengekstrak seluruh ID anggota (Multi-Assignee)
function parseAssignees(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(Number).filter(Boolean);
  }
  if (typeof input === 'string') {
    if (input.startsWith('[')) {
      try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) return parsed.map(Number).filter(Boolean);
      } catch (e) {}
    }
    return input.split(',').map(Number).filter(Boolean);
  }
  return [Number(input)].filter(Boolean);
}

// HELPER: Parser untuk menangani masukan lampiran berupa Tautan/Link URL
function parseLinks(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') {
    if (input.startsWith('[')) {
      try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) {}
    }
    return [input].filter(Boolean);
  }
  return [];
}

export async function index(req, res) {
  const user = req.user;
  const { periode_id: periodeId, semester } = await Semester.fromRequest(req);

  const params = [user.id];
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

  try {
    const { rows } = await pool.query(
      `SELECT s.*,
          (s.verifikasi_katim_status = 'disetujui' OR s.verifikasi_kasubag_status = 'disetujui') AS locked,
          json_build_object(
            'id', t.id, 'judul', t.judul, 'team_id', t.team_id
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
       LEFT JOIN users a ON a.id = s.assigned_to
       LEFT JOIN users c ON c.id = s.created_by
       LEFT JOIN users vk ON vk.id = s.verifikasi_katim_by
       LEFT JOIN users vs ON vs.id = s.verifikasi_kasubag_by
       WHERE s.id = $1`,
      [subtugasId]
    );

    const subtugas = rows[0];
    if (!subtugas) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });

    // Ambil file lampiran subtugas utama
    const { rows: subFiles } = await pool.query(
      `SELECT * FROM subtugas_files WHERE subtugas_id = $1 AND subtugas_update_id IS NULL`,
      [subtugasId]
    );
    subtugas.files = subFiles.map(f => ({
      ...f,
      url: (f.file_type === 'link' || f.file_type === 'lainnya') && f.file_path && f.file_path.startsWith('http')
        ? f.file_path 
        : fileUrl(req, f.file_path)
    }));

    // Ambil riwayat update progres dari anggota (Murni gunakan persentase)
    const { rows: updateRows } = await pool.query(
      `SELECT su.*, su.persentase AS progress, json_build_object('id', u.id, 'name', u.name) AS user
       FROM subtugas_updates su 
       LEFT JOIN users u ON u.id = su.user_id
       WHERE su.subtugas_id = $1 ORDER BY su.created_at DESC`,
      [subtugasId]
    );
    
    for (const upd of updateRows) {
      upd.persentase = upd.persentase || upd.progress || 0;

      const { rows: fileRows } = await pool.query(
        `SELECT * FROM subtugas_files WHERE subtugas_update_id = $1`,
        [upd.id]
      );
      upd.files = fileRows.map((f) => ({
        ...f,
        url: (f.file_type === 'link' || f.file_type === 'lainnya') && f.file_path && f.file_path.startsWith('http')
          ? f.file_path 
          : fileUrl(req, f.file_path)
      }));
      
      const linkFile = fileRows.find(f => f.file_type === 'link' || f.file_type === 'lainnya');
      if (linkFile) {
        upd.link_url = linkFile.file_path;
      }
    }
    subtugas.updates = updateRows;

    // Ambil komentar/catatan atasan
    const { rows: comments } = await pool.query(
      `SELECT c.*, json_build_object('id', u.id, 'name', u.name, 'role', u.role) AS user
       FROM comments c 
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.subtugas_id = $1 ORDER BY c.created_at ASC`,
      [subtugasId]
    );
    subtugas.comments = comments;

    return res.json(subtugas);
  } catch (error) {
    console.error("Error show subtugas:", error);
    return res.status(500).json({ message: "Gagal mengambil detail subtugas: " + error.message });
  }
}

export async function store(req, res) {
  const tugasId = req.params.tugas;
  const { judul, deskripsi = null, deadline } = req.body || {};

  const allowedRoles = ['kasubag', 'katim', 'anggota', 'kabalai'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk menambahkan subtugas.' });
  }

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

    const links = parseLinks(req.body?.links);
    for (const l of links) {
      const rawUrl = typeof l === 'string' ? l : l.url;
      const formattedUrl = formatUrl(rawUrl);
      const nameStr = (typeof l === 'object' && l.name) ? l.name : formattedUrl;
      if (formattedUrl) {
        await pool.query(
          `INSERT INTO subtugas_files (subtugas_id, file_path, file_name, file_type, uploaded_at)
           VALUES ($1,$2,$3,'lainnya',now())`,
          [subtugas.id, formattedUrl, nameStr]
        );
      }
    }

    await recalculateProgress(tugasId);

    const deadlineStr = subtugas.deadline
      ? new Date(subtugas.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null;

    for (const uid of assigneesList) {
      await NotificationService.kirim(
        uid,
        'Subtugas baru diterima',
        `Anda mendapat subtugas baru: ${subtugas.judul}` + (deadlineStr ? ` (deadline ${deadlineStr})` : ''),
        `/anggota/subtugas/${subtugas.id}`
      );
    }

    await ActivityLog.catat(req.user.id, `membuat subtugas ${subtugas.judul}`, 'subtugas', subtugas.id);

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

export async function storeUpdate(req, res) {
  const subtugasId = req.params.subtugas || req.params.id;
  const { persentase, progress, catatan, link_url } = req.body || {};
  const newProgress = Number(persentase ?? progress ?? 0);

  try {
    const { rows: subRows } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);
    if (!subRows.length) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });
    const subtugas = subRows[0];

    // PENYESUAIAN: Jika 100%, ubah status menjadi 'Menunggu Verifikasi Katim'
    const newStatus = newProgress === 0 ? 'Belum Dimulai' : newProgress === 100 ? 'Menunggu Verifikasi Katim' : 'Sedang Berjalan';

    // Murni gunakan kolom persentase untuk tabel subtugas_updates
    const { rows: updRows } = await pool.query(
      `INSERT INTO subtugas_updates (subtugas_id, user_id, persentase, catatan, created_at)
       VALUES ($1, $2, $3, $4, now()) RETURNING *`,
      [subtugasId, req.user.id, newProgress, catatan || null]
    );
    const update = updRows[0];

    // Simpan file jika ada
    const files = req.files || [];
    if (files.length > 0) {
      for (const f of files) {
        const { url } = await uploadToSupabase(f, 'bukti-progres');
        const type = classifyFileType(f.originalname);
        await pool.query(
          `INSERT INTO subtugas_files (subtugas_id, subtugas_update_id, file_path, file_name, file_type, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, now())`,
          [subtugasId, update.id, url, f.originalname, type]
        );
      }
    }

    // Simpan link jika ada (Otomatis format https:// dan gunakan file_type='lainnya')
    const formattedLink = formatUrl(link_url);
    if (formattedLink) {
      await pool.query(
        `INSERT INTO subtugas_files (subtugas_id, subtugas_update_id, file_path, file_name, file_type, uploaded_at)
         VALUES ($1, $2, $3, $4, 'lainnya', now())`,
        [subtugasId, update.id, formattedLink, formattedLink]
      );
    }

    // Update status & progress di tabel subtugas utama
    await pool.query(
      `UPDATE subtugas SET progress = $1, status = $2, updated_at = now() WHERE id = $3`,
      [newProgress, newStatus, subtugasId]
    );

    await recalculateProgress(subtugas.tugas_id);
    await ActivityLog.catat(req.user.id, `memperbarui progres subtugas (${newProgress}%)`, 'subtugas', subtugasId);

    return res.status(201).json({ message: 'Progres berhasil diperbarui.', update });
  } catch (error) {
    return res.status(500).json({ message: 'Gagal memperbarui progres: ' + error.message });
  }
}

export async function update(req, res) {
  const subtugasId = req.params.subtugas;
  const { judul, deskripsi, deadline } = req.body || {};

  try {
    const { rows: currentRows } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);
    if (!currentRows.length) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });
    const current = currentRows[0];

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

    const links = parseLinks(req.body?.links);
    for (const l of links) {
      const rawUrl = typeof l === 'string' ? l : l.url;
      const formattedUrl = formatUrl(rawUrl);
      const nameStr = (typeof l === 'object' && l.name) ? l.name : formattedUrl;
      if (formattedUrl) {
        await pool.query(
          `INSERT INTO subtugas_files (subtugas_id, file_path, file_name, file_type, uploaded_at)
           VALUES ($1,$2,$3,'lainnya',now())`,
          [subtugas.id, formattedUrl, nameStr]
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

export async function destroyUpdate(req, res) {
  const updateId = req.params.updateId || req.params.update || req.params.id;

  try {
    const { rows: updRows } = await pool.query(
      `SELECT su.*, s.tugas_id 
       FROM subtugas_updates su
       JOIN subtugas s ON s.id = su.subtugas_id
       WHERE su.id = $1`,
      [updateId]
    );

    if (!updRows.length) {
      return res.status(404).json({ message: 'Data progres tidak ditemukan.' });
    }

    const targetUpdate = updRows[0];
    const subtugasId = targetUpdate.subtugas_id;
    const tugasId = targetUpdate.tugas_id;

    const isOwner = targetUpdate.user_id === req.user.id;
    const isAtasan = ['katim', 'kasubag', 'kabalai'].includes(req.user.role);

    if (!isOwner && !isAtasan) {
      return res.status(403).json({ message: 'Anda tidak memiliki wewenang untuk menghapus progres ini.' });
    }

    await pool.query(`DELETE FROM subtugas_files WHERE subtugas_update_id = $1`, [updateId]);
    await pool.query(`DELETE FROM subtugas_updates WHERE id = $1`, [updateId]);

    // Murni SELECT persentase
    const { rows: remainingUpdates } = await pool.query(
      `SELECT persentase FROM subtugas_updates 
       WHERE subtugas_id = $1 
       ORDER BY created_at DESC LIMIT 1`,
      [subtugasId]
    );

    const newProgress = remainingUpdates.length > 0 ? Number(remainingUpdates[0].persentase) : 0;
    
    // PENYESUAIAN: Jika 100%, ubah status menjadi 'Menunggu Verifikasi Katim'
    const newStatus = newProgress === 0 ? 'Belum Dimulai' : newProgress === 100 ? 'Menunggu Verifikasi Katim' : 'Sedang Berjalan';

    await pool.query(
      `UPDATE subtugas SET progress = $1, status = $2, updated_at = now() WHERE id = $3`,
      [newProgress, newStatus, subtugasId]
    );

    await recalculateProgress(tugasId);
    await ActivityLog.catat(req.user.id, `menghapus progres pada subtugas ID: ${subtugasId}`, 'subtugas', subtugasId);

    return res.json({ 
      message: 'Progres berhasil dihapus.',
      subtugas_id: subtugasId,
      new_progress: newProgress,
      new_status: newStatus
    });

  } catch (error) {
    return res.status(500).json({ message: 'Gagal menghapus progres: ' + error.message });
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