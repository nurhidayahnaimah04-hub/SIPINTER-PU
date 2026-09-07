import pool from '../db/pool.js';

export async function catat(userId, aksi, tabel = null, recordId = null) {
  await pool.query(
    `INSERT INTO activity_logs (user_id, aksi, tabel, record_id) VALUES ($1,$2,$3,$4)`,
    [userId, aksi, tabel, recordId]
  );
}
