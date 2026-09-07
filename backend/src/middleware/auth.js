import crypto from 'crypto';
import pool from '../db/pool.js';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  let [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    // Fallback: EventSource tidak bisa kirim header custom, jadi endpoint SSE
    // (/notifications/stream) mengirim token lewat query string.
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Unauthenticated.' });
  }

  const tokenHash = hashToken(token);

  const { rows } = await pool.query(
    `SELECT u.* FROM auth_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = $1`,
    [tokenHash]
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: 'Unauthenticated.' });
  }

  pool
    .query(`UPDATE auth_tokens SET last_used_at = now() WHERE token_hash = $1`, [tokenHash])
    .catch(() => {});

  const user = rows[0];
  delete user.password;
  delete user.remember_token;

  req.user = user;
  req.authToken = token;
  req.authTokenHash = tokenHash;

  next();
}
