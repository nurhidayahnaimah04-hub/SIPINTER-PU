import pool from '../db/pool.js';

/**
 * Progress tugas = rata-rata progress seluruh subtugas (bobot sama rata,
 * otomatis menyesuaikan kalau jumlah subtugas bertambah/berkurang).
 * Port dari App\Models\Tugas::recalculateProgress()
 */
export async function recalculateProgress(tugasId) {
  const { rows: subtugasRows } = await pool.query(
    `SELECT progress, status FROM subtugas WHERE tugas_id = $1`,
    [tugasId]
  );
  const { rows: tugasRows } = await pool.query(`SELECT * FROM tugas WHERE id = $1`, [tugasId]);
  const tugas = tugasRows[0];
  if (!tugas) return;

  let progress = 0;
  let status = tugas.status;

  if (subtugasRows.length > 0) {
    const avg = subtugasRows.reduce((s, r) => s + Number(r.progress), 0) / subtugasRows.length;
    progress = Math.round(avg * 100) / 100;

    const allSelesai = subtugasRows.every((s) => s.status === 'Selesai');
    if (allSelesai) {
      if (status !== 'Selesai') status = 'Menunggu Verifikasi';
    } else if (progress > 0 && ['Belum Dimulai', 'Menunggu Verifikasi'].includes(status)) {
      status = 'Sedang Berjalan';
    }
  }

  await pool.query(`UPDATE tugas SET progress = $1, status = $2, updated_at = now() WHERE id = $3`, [
    progress,
    status,
    tugasId,
  ]);
}

export function getLocked(subtugas) {
  return subtugas.verifikasi_katim_status === 'disetujui' || subtugas.verifikasi_kasubag_status === 'disetujui';
}
