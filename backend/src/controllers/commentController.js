import pool from '../db/pool.js';

const CAN_COMMENT_ROLES = ['kabalai', 'kasubag', 'katim'];

export async function index(req, res) {
  const { tugas_id, subtugas_id } = req.query;

  const conditions = [];
  const params = [];

  if (tugas_id) {
    params.push(tugas_id);
    conditions.push(`c.tugas_id = $${params.length}`);
  }
  if (subtugas_id) {
    params.push(subtugas_id);
    conditions.push(`c.subtugas_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT c.*, json_build_object('id', u.id, 'name', u.name, 'role', u.role, 'foto', u.foto) AS user
     FROM comments c JOIN users u ON u.id = c.user_id
     ${where}
     ORDER BY c.created_at ASC`,
    params
  );

  return res.json(rows);
}

export async function store(req, res) {
  if (!CAN_COMMENT_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses untuk memberi komentar.' });
  }

  const { tugas_id = null, subtugas_id = null, komentar } = req.body || {};

  if (!komentar) {
    return res.status(422).json({ message: 'Komentar wajib diisi.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO comments (tugas_id, subtugas_id, user_id, komentar) VALUES ($1,$2,$3,$4) RETURNING *`,
    [tugas_id || null, subtugas_id || null, req.user.id, komentar]
  );

  const { rows: userRows } = await pool.query(`SELECT id, name, role, foto FROM users WHERE id = $1`, [
    req.user.id,
  ]);

  return res.status(201).json({ ...rows[0], user: userRows[0] });
}
