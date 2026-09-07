import pool from '../db/pool.js';
import { buildPaginationResponse } from '../utils/paginate.js';
import * as NotificationHub from '../services/notificationHub.js';

export async function index(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const perPage = 5;
  const offset = (page - 1) * perPage;

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM notifications
     WHERE user_id = $1 AND created_at >= now() - interval '30 days'`,
    [req.user.id]
  );

const { rows } = await pool.query(
  `SELECT * FROM notifications
   WHERE user_id = $1 AND created_at >= now() - interval '30 days'
   ORDER BY created_at DESC, id DESC
   LIMIT $2 OFFSET $3`,
  [req.user.id, perPage, offset]
);

  return res.json(
    buildPaginationResponse({
      data: rows,
      total: countRows[0].total,
      page,
      perPage,
      path: '/api/notifications',
    })
  );
}

export async function unreadCount(req, res) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications
     WHERE user_id = $1 AND is_read = false AND created_at >= now() - interval '30 days'`,
    [req.user.id]
  );
  return res.json({ count: rows[0].count });
}

export async function markRead(req, res) {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = true, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Notifikasi tidak ditemukan.' });
  }

  return res.json(rows[0]);
}

export async function markAllRead(req, res) {
  await pool.query(
    `UPDATE notifications SET is_read = true, updated_at = now() WHERE user_id = $1 AND is_read = false`,
    [req.user.id]
  );
  return res.json({ message: 'Semua notifikasi ditandai dibaca.' });
}

export function stream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');

  NotificationHub.subscribe(req.user.id, res);

  // Ping tiap 25 detik supaya koneksi tidak diputus proxy/browser karena idle.
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    NotificationHub.unsubscribe(req.user.id, res);
  });
}