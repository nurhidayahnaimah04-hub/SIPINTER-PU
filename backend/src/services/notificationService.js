import pool from '../db/pool.js';
import * as NotificationHub from './notificationHub.js';

export async function kirim(userId, judul, isi = null, link = null) {
  if (!userId) return;
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, judul, isi, link, is_read) VALUES ($1,$2,$3,$4,false) RETURNING *`,
    [userId, judul, isi, link]
  );
  NotificationHub.push(userId, rows[0]);
}

export async function kirimKeBanyak(userIds, judul, isi = null, link = null) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  for (const id of unique) {
    await kirim(id, judul, isi, link);
  }
}