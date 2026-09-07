import pool from '../db/pool.js';

// Hapus permanen notifikasi yang sudah lebih dari 30 hari -- dari DB, otomatis
// juga hilang dari tampilan karena datanya memang sudah tidak ada.
export async function hapusNotifikasiKedaluwarsa() {
  const { rowCount } = await pool.query(
    `DELETE FROM notifications WHERE created_at < now() - interval '30 days'`
  );
  if (rowCount > 0) {
    console.log(`[cleanup] ${rowCount} notifikasi lebih dari 30 hari dihapus.`);
  }
}