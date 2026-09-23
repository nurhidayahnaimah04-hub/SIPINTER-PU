import pool from '../db/pool.js';
import * as ActivityLog from '../utils/activityLog.js';
import * as NotificationService from '../services/notificationService.js';
import { recalculateProgress, getLocked } from '../utils/tugasHelper.js';
import { classifyFileType, uploadToSupabase, fileUrl } from '../middleware/upload.js';

// Anggota/Katim mengirim update progres + bukti (foto/pdf/word/excel/dll, multi-file).
export async function store(req, res) {
  const user = req.user;
  const subtugasId = req.params.subtugas;

  const { rows: subtugasRows } = await pool.query(`SELECT * FROM subtugas WHERE id = $1`, [subtugasId]);
  const subtugas = subtugasRows[0];
  if (!subtugas) return res.status(404).json({ message: 'Subtugas tidak ditemukan.' });

  if (subtugas.assigned_to !== user.id) {
    return res.status(403).json({ message: 'Anda bukan pemilik subtugas ini.' });
  }

  if (getLocked(subtugas)) {
    return res.status(422).json({
      message: 'Subtugas ini sudah terverifikasi dan terkunci, tidak bisa diubah lagi.',
    });
  }

  const persentase = Number(req.body?.persentase);
  if (Number.isNaN(persentase) || persentase < 0 || persentase > 100) {
    return res.status(422).json({ message: 'Persentase tidak valid (0-100).' });
  }

  // Cek apakah user yang mengirim update ini bertindak sebagai Katim
  const isKatim = user.role === 'katim';

  const catatan = req.body?.catatan || null;

  // Logika Status: Jika Katim yang mengerjakan & persentase 100%, langsung lanjut ke Kasubag
  let newStatus = 'Sedang Berjalan';
  if (persentase >= 100) {
    newStatus = isKatim ? 'Menunggu Verifikasi Kasubag' : 'Menunggu Verifikasi Katim';
  }

  const { rows: updateRows } = await pool.query(
    `INSERT INTO subtugas_updates (subtugas_id, user_id, persentase, catatan, status)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [subtugasId, user.id, persentase, catatan, newStatus]
  );
  const update = updateRows[0];

  const files = req.files || [];
  for (const f of files) {
    const { url } = await uploadToSupabase(f, 'bukti-kerja');
    const type = classifyFileType(f.originalname);
    await pool.query(
      `INSERT INTO subtugas_files (subtugas_update_id, file_path, file_name, file_type, uploaded_at)
       VALUES ($1,$2,$3,$4,now())`,
      [update.id, url, f.originalname, type]
    );
  }

  // Tentukan status verifikasi Katim: Jika dikerjakan Katim, otomatis 'disetujui'
  let verifikasiKatimStatus = null;
  if (newStatus === 'Menunggu Verifikasi Katim') {
    verifikasiKatimStatus = 'menunggu';
  } else if (newStatus === 'Menunggu Verifikasi Kasubag' && isKatim) {
    verifikasiKatimStatus = 'disetujui';
  }

  // Progress subtugas = snapshot update terbaru. Reset verifikasi kalau direvisi ulang.
  await pool.query(
    `UPDATE subtugas SET progress = $1, status = $2,
        verifikasi_katim_status = $3, verifikasi_kasubag_status = NULL, updated_at = now()
     WHERE id = $4`,
    [persentase, newStatus, verifikasiKatimStatus, subtugasId]
  );

  await recalculateProgress(subtugas.tugas_id);

  // Kirim Notifikasi Sesuai Peran
  if (newStatus === 'Menunggu Verifikasi Katim') {
    const { rows: teamRows } = await pool.query(
      `SELECT tm.katim_id FROM tugas t JOIN teams tm ON tm.id = t.team_id WHERE t.id = $1`,
      [subtugas.tugas_id]
    );
    const katimId = teamRows[0]?.katim_id;
    if (katimId) {
      await NotificationService.kirim(
        katimId,
        'Subtugas menunggu verifikasi',
        `${user.name} menyelesaikan '${subtugas.judul}' dan menunggu verifikasi Anda.`,
        '/katim/verifikasi'
      );
    }
  } else if (newStatus === 'Menunggu Verifikasi Kasubag') {
    // Kirim notifikasi langsung ke semua Kasubag jika pengerjaan oleh Katim
    const { rows: kasubagRows } = await pool.query(`SELECT id FROM users WHERE role = 'kasubag'`);
    await NotificationService.kirimKeBanyak(
      kasubagRows.map((r) => r.id),
      'Subtugas menunggu verifikasi akhir',
      `Katim ${user.name} menyelesaikankan subtugas '${subtugas.judul}', menunggu verifikasi Anda.`,
      '/kasubag/verifikasi'
    );
  }

  await ActivityLog.catat(
    user.id,
    `update progres subtugas ${subtugas.judul} (${persentase}%)`,
    'subtugas',
    subtugas.id
  );

  const { rows: fileRows } = await pool.query(`SELECT * FROM subtugas_files WHERE subtugas_update_id = $1`, [
    update.id,
  ]);
  update.files = fileRows.map((f) => ({ ...f, url: fileUrl(req, f.file_path) }));

  return res.status(201).json(update);
}