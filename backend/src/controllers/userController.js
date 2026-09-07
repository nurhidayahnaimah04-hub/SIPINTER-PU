import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import * as ActivityLog from '../utils/activityLog.js';
import { buildPaginationResponse } from '../utils/paginate.js';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

function sanitize(user) {
  const clone = { ...user };
  delete clone.password;
  delete clone.remember_token;
  return clone;
}

export async function index(req, res) {
  const { search, role } = req.query;
  const page = Math.max(Number(req.query.page || 1), 1);
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(name ILIKE $${idx} OR nip ILIKE $${idx} OR email ILIKE $${idx})`);
  }
  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM users ${where}`, params);

  const dataParams = [...params, perPage, offset];
  const { rows } = await pool.query(
    `SELECT * FROM users ${where} ORDER BY name ASC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return res.json(
    buildPaginationResponse({
      data: rows.map(sanitize),
      total: countRows[0].total,
      page,
      perPage,
      path: '/api/users',
    })
  );
}

export async function store(req, res) {
  const { name, nip = null, email, password, role, jabatan = null } = req.body || {};

  if (!name || !email || !password || !role) {
    return res.status(422).json({ message: 'Data user tidak lengkap.' });
  }

  const hash = await bcrypt.hash(password, ROUNDS);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, nip, email, password, role, jabatan, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING *`,
      [name, nip, email, hash, role, jabatan]
    );
    const user = rows[0];

    await ActivityLog.catat(req.user.id, `menambahkan user ${user.name}`, 'users', user.id);

    return res.status(201).json(sanitize(user));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(422).json({ message: 'Email atau NIP sudah digunakan.' });
    }
    throw err;
  }
}

export async function update(req, res) {
  const userId = req.params.user;
  const { name, nip, email, role, jabatan, is_active, password } = req.body || {};

  const fields = {};
  if (typeof name !== 'undefined') fields.name = name;
  if (typeof nip !== 'undefined') fields.nip = nip || null;
  if (typeof email !== 'undefined') fields.email = email;
  if (typeof role !== 'undefined') fields.role = role;
  if (typeof jabatan !== 'undefined') fields.jabatan = jabatan || null;
  if (typeof is_active !== 'undefined') fields.is_active = is_active;
  if (password) fields.password = await bcrypt.hash(password, ROUNDS);

  const keys = Object.keys(fields);
  if (keys.length === 0) {
    const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
    return res.json(sanitize(rows[0]));
  }

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => fields[k]);
  values.push(userId);

  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });

    await ActivityLog.catat(req.user.id, `mengubah data user ${rows[0].name}`, 'users', rows[0].id);

    return res.json(sanitize(rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(422).json({ message: 'Email atau NIP sudah digunakan.' });
    }
    throw err;
  }
}

export async function destroy(req, res) {
  const { rows } = await pool.query(
    `UPDATE users SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
    [req.params.user]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });

  await ActivityLog.catat(req.user.id, `menonaktifkan user ${rows[0].name}`, 'users', rows[0].id);

  return res.json({ message: 'User dinonaktifkan.' });
}

export async function destroyPermanent(req, res) {
  const userId = req.params.user;

  const { rows: userRows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
  if (userRows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });

  // Skema DB pakai ON DELETE CASCADE untuk katim_id, assigned_to, created_by --
  // kalau langsung dihapus, tim/tugas/subtugas milik user ini ikut lenyap.
  // Jadi hapus permanen ditolak dulu selama masih ada data yang bergantung padanya.
  const { rows: teamRows } = await pool.query(`SELECT nama_tim FROM teams WHERE katim_id = $1`, [userId]);
  if (teamRows.length > 0) {
    return res.status(422).json({
      message: `User ini masih menjadi Kepala Tim di: ${teamRows.map((t) => t.nama_tim).join(', ')}. Ganti Katim tim tersebut dulu sebelum menghapus permanen.`,
    });
  }

  const { rows: subtugasRows } = await pool.query(`SELECT id FROM subtugas WHERE assigned_to = $1`, [userId]);
  if (subtugasRows.length > 0) {
    return res.status(422).json({
      message: `User ini masih memiliki ${subtugasRows.length} subtugas yang di-assign ke dia. Alihkan dulu subtugas tersebut, atau nonaktifkan saja user ini.`,
    });
  }

  const { rows: tugasRows } = await pool.query(`SELECT id FROM tugas WHERE created_by = $1`, [userId]);
  if (tugasRows.length > 0) {
    return res.status(422).json({
      message: `User ini pernah membuat ${tugasRows.length} tugas. Menghapus permanen akan ikut menghapus tugas tersebut -- disarankan nonaktifkan saja, bukan dihapus.`,
    });
  }

  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  await ActivityLog.catat(req.user.id, `menghapus permanen user ${userRows[0].name}`, 'users', userId);

  return res.json({ message: 'User dihapus permanen.' });
}