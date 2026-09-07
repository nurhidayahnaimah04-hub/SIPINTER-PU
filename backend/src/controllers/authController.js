import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { hashToken } from '../middleware/auth.js';
import { uploadToSupabase } from '../middleware/upload.js';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

function sanitizeUser(user) {
  const clone = { ...user };
  delete clone.password;
  delete clone.remember_token;
  return clone;
}

export async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(422).json({
      message: 'The given data was invalid.',
      errors: {
        email: !email ? ['Email wajib diisi.'] : undefined,
        password: !password ? ['Password wajib diisi.'] : undefined,
      },
    });
  }

  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(422).json({
      message: 'Email atau password salah.',
      errors: { email: ['Email atau password salah.'] },
    });
  }

  if (!user.is_active) {
    return res.status(422).json({
      message: 'Akun Anda dinonaktifkan. Hubungi admin.',
      errors: { email: ['Akun Anda dinonaktifkan. Hubungi admin.'] },
    });
  }

  const plainToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(plainToken);

  await pool.query(`INSERT INTO auth_tokens (user_id, name, token_hash) VALUES ($1,'auth_token',$2)`, [
    user.id,
    tokenHash,
  ]);

  return res.json({ user: sanitizeUser(user), token: plainToken });
}

export async function logout(req, res) {
  await pool.query(`DELETE FROM auth_tokens WHERE token_hash = $1`, [req.authTokenHash]);
  return res.json({ message: 'Berhasil logout.' });
}

export async function me(req, res) {
  return res.json(req.user);
}

export async function updateProfile(req, res) {
  const user = req.user;
  const body = req.body || {};
  const fields = {};

  if (typeof body.name !== 'undefined') fields.name = body.name;
  if (typeof body.jabatan !== 'undefined') fields.jabatan = body.jabatan || null;

  if (req.file) {
    const { url } = await uploadToSupabase(req.file, 'profil');
    fields.foto = url;
  }

  if (body.password) {
    fields.password = await bcrypt.hash(body.password, ROUNDS);
  }

  const keys = Object.keys(fields);
  if (keys.length === 0) {
    const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [user.id]);
    return res.json(sanitizeUser(rows[0]));
  }

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => fields[k]);
  values.push(user.id);

  const { rows } = await pool.query(
    `UPDATE users SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );

  return res.json(sanitizeUser(rows[0]));
}