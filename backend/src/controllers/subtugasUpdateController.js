import pool from '../db/pool.js';
import * as ActivityLog from '../utils/activityLog.js';
import * as NotificationService from '../services/notificationService.js';
import { recalculateProgress } from '../utils/tugasHelper.js';
import { classifyFileType, uploadToSupabase, fileUrl } from '../middleware/upload.js';

// HELPER: Otomatis menambahkan https:// jika pengguna lupa mencantumkan protokol URL
function formatUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';
  
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

// HELPER: Parser tangguh untuk menangani masukan lampiran berupa Tautan/Link URL
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
  const subtugasId = req.params.subtugas;

  const { rows } = await pool.query(
    `SELECT su.*, s.status AS status, json_build_object('id', u.id, 'name', u.name, 'role', u.role) AS user
     FROM subtugas_updates su
     JOIN subtugas s ON s.id = su.subtugas_id
     JOIN users u ON u.id = su.user_id
     WHERE su.subtugas_id = $1
     ORDER BY su.created_at DESC`,
    [subtugasId]
  );

  for (const upd of rows) {
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
  }

  return res.json(rows);
}

export async function store(req, res) {
  const subtugasId = req.params.subtugas;
  const { progress = 0, persentase, catatan = null, links, link_url } = req.body || {};
  const valProgress = Number(persentase ?? progress ?? 0);

  try {
    const { rows: subRows } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);
    if (!subRows.length) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });
    const subtugas = subRows[0];

    // 1. Simpan riwayat update progres ke kolom persentase
    const { rows: updateRows } = await pool.query(
      `INSERT INTO subtugas_updates (subtugas_id, user_id, persentase, catatan, created_at)
       VALUES ($1, $2, $3, $4, now()) RETURNING *`,
      [subtugasId, req.user.id, valProgress, catatan]
    );
    const update = updateRows[0];

    // 2. Simpan Berkas Fisik jika ada (File Dokumen, Gambar, PDF, Excel, dll)
    const files = req.files || [];
    if (files.length > 0) {
      for (const f of files) {
        const { url } = await uploadToSupabase(f, 'bukti-kerja');
        const type = classifyFileType(f.originalname);
        await pool.query(
          `INSERT INTO subtugas_files (subtugas_id, subtugas_update_id, file_path, file_name, file_type, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, now())`,
          [subtugasId, update.id, url, f.originalname, type]
        );
      }
    }

    // 3. Simpan Tautan / Link URL dari `link_url` (Otomatis ditambahkan https:// jika lupa)
    const formattedSingleLink = formatUrl(link_url);
    if (formattedSingleLink) {
      await pool.query(
        `INSERT INTO subtugas_files (subtugas_id, subtugas_update_id, file_path, file_name, file_type, uploaded_at)
         VALUES ($1, $2, $3, $4, 'lainnya', now())`,
        [subtugasId, update.id, formattedSingleLink, formattedSingleLink]
      );
    }

    // 4. Simpan Tautan / Link URL jika dikirim sebagai array `links`
    const parsedLinks = parseLinks(links);
    for (const l of parsedLinks) {
      const rawUrl = typeof l === 'string' ? l : l.url;
      const formattedArrayLink = formatUrl(rawUrl);
      const nameStr = (typeof l === 'object' && l.name) ? l.name : formattedArrayLink;

      if (formattedArrayLink && formattedArrayLink !== formattedSingleLink) {
        await pool.query(
          `INSERT INTO subtugas_files (subtugas_id, subtugas_update_id, file_path, file_path, file_type, uploaded_at)
           VALUES ($1, $2, $3, $4, 'lainnya', now())`,
          [subtugasId, update.id, formattedArrayLink, nameStr]
        );
      }
    }

    // 5. Update status & persentase subtugas utama
    const newStatus = valProgress === 100 ? 'Menunggu Verifikasi Katim' : valProgress > 0 ? 'Sedang Berjalan' : 'Belum Dimulai';

    await pool.query(
      `UPDATE subtugas SET progress = $1, status = $2, updated_at = now() WHERE id = $3`,
      [valProgress, newStatus, subtugasId]
    );

    // Kirim notifikasi ke Katim jika progres mencapai 100%
    if (valProgress === 100) {
      const { rows: katimRows } = await pool.query(
        `SELECT tm.katim_id 
         FROM tugas t 
         LEFT JOIN teams tm ON tm.id = t.team_id 
         WHERE t.id = $1`,
        [subtugas.tugas_id]
      );
      
      let targetKatimId = katimRows[0]?.katim_id;

      if (!targetKatimId) {
        const { rows: fallbackKatim } = await pool.query(
          `SELECT tm.katim_id 
           FROM team_members mem 
           JOIN teams tm ON tm.id = mem.team_id 
           WHERE mem.user_id = $1`,
          [req.user.id]
        );
        targetKatimId = fallbackKatim[0]?.katim_id;
      }

      if (targetKatimId) {
        await NotificationService.kirim(
          targetKatimId,
          'Subtugas perlu verifikasi',
          `Subtugas '${subtugas.judul}' telah mencapai 100% dan menunggu verifikasi Anda.`,
          '/katim/verifikasi'
        );
      }
    }

    // 6. Rekalkulasi progres Tugas Utama
    await recalculateProgress(subtugas.tugas_id);
    await ActivityLog.catat(req.user.id, `memperbarui progres subtugas ${subtugas.judul} menjadi ${valProgress}%`, 'subtugas', subtugasId);

    // 7. Format dan kembalikan daftar file + link yang baru diunggah beserta status terbarunya
    const { rows: savedFiles } = await pool.query(
      `SELECT * FROM subtugas_files WHERE subtugas_update_id = $1`,
      [update.id]
    );
    update.status = newStatus;
    update.files = savedFiles.map(f => ({
      ...f,
      url: (f.file_type === 'link' || f.file_type === 'lainnya') && f.file_path && f.file_path.startsWith('http')
        ? f.file_path 
        : fileUrl(req, f.file_path)
    }));

    return res.status(201).json(update);
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memperbarui progres: ' + err.message });
  }
}

export async function destroy(req, res) {
  const updateId = req.params.update || req.params.id;

  const { rows } = await pool.query(`SELECT * FROM subtugas_updates WHERE id = $1`, [updateId]);
  if (!rows.length) return res.status(404).json({ message: 'Update tidak ditemukan.' });
  const update = rows[0];

  if (update.user_id !== req.user.id && !['kasubag', 'katim', 'kabalai'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses.' });
  }

  await pool.query(`DELETE FROM subtugas_files WHERE subtugas_update_id = $1`, [updateId]);
  await pool.query(`DELETE FROM subtugas_updates WHERE id = $1`, [updateId]);

  const { rows: subRows } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [update.subtugas_id]);
  if (subRows.length) {
    const subtugas = subRows[0];
    const { rows: remaining } = await pool.query(
      `SELECT persentase FROM subtugas_updates WHERE subtugas_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [subtugas.id]
    );
    const lastProgress = remaining.length ? Number(remaining[0].persentase || 0) : 0;
    const lastStatus = lastProgress === 100 ? 'Menunggu Verifikasi Katim' : lastProgress > 0 ? 'Sedang Berjalan' : 'Belum Dimulai';

    await pool.query(
      `UPDATE subtugas SET progress = $1, status = $2, updated_at = now() WHERE id = $3`,
      [lastProgress, lastStatus, subtugas.id]
    );
    await recalculateProgress(subtugas.tugas_id);
  }

  return res.json({ message: 'Update progres dihapus.' });
}