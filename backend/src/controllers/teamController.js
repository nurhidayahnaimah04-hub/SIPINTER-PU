import pool from '../db/pool.js';
import * as ActivityLog from '../utils/activityLog.js';

async function loadTeam(teamId) {
  const { rows } = await pool.query(
    `SELECT t.*,
       json_build_object('id', k.id, 'name', k.name, 'jabatan', k.jabatan, 'foto', k.foto) AS katim,
       COALESCE((
         SELECT json_agg(json_build_object('id', m.id, 'name', m.name, 'jabatan', m.jabatan, 'foto', m.foto))
         FROM team_members tm JOIN users m ON m.id = tm.user_id
         WHERE tm.team_id = t.id
       ), '[]'::json) AS members
     FROM teams t
     JOIN users k ON k.id = t.katim_id
     WHERE t.id = $1`,
    [teamId]
  );
  return rows[0];
}

export async function index(req, res) {
  const user = req.user;
  const params = [];
  let where = '';

  if (user.role === 'katim') {
    params.push(user.id);
    where = `WHERE t.katim_id = $1`;
  }

  const { rows } = await pool.query(
    `SELECT t.*,
       json_build_object('id', k.id, 'name', k.name, 'jabatan', k.jabatan, 'foto', k.foto) AS katim,
       COALESCE((
         SELECT json_agg(json_build_object('id', m.id, 'name', m.name, 'jabatan', m.jabatan, 'foto', m.foto))
         FROM team_members tm JOIN users m ON m.id = tm.user_id
         WHERE tm.team_id = t.id
       ), '[]'::json) AS members
     FROM teams t
     JOIN users k ON k.id = t.katim_id
     ${where}
     ORDER BY t.nama_tim ASC`,
    params
  );

  return res.json(rows);
}

export async function store(req, res) {
  const { nama_tim, kode_tim = null, katim_id, anggota_ids = [] } = req.body || {};

  if (!nama_tim || !katim_id) {
    return res.status(422).json({ message: 'Data tim tidak lengkap.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO teams (nama_tim, kode_tim, katim_id) VALUES ($1,$2,$3) RETURNING *`,
    [nama_tim, kode_tim, katim_id]
  );
  const team = rows[0];

  if (Array.isArray(anggota_ids) && anggota_ids.length > 0) {
    for (const uid of anggota_ids) {
      await pool.query(
        `INSERT INTO team_members (team_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [team.id, uid]
      );
    }
  }

  await ActivityLog.catat(req.user.id, `membuat tim ${team.nama_tim}`, 'teams', team.id);

  return res.status(201).json(await loadTeam(team.id));
}

export async function update(req, res) {
  const teamId = req.params.team;
  const { nama_tim, kode_tim, katim_id, anggota_ids } = req.body || {};

  const fields = {};
  if (typeof nama_tim !== 'undefined') fields.nama_tim = nama_tim;
  if (typeof kode_tim !== 'undefined') fields.kode_tim = kode_tim;
  if (typeof katim_id !== 'undefined') fields.katim_id = katim_id;

  const keys = Object.keys(fields);
  if (keys.length > 0) {
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);
    values.push(teamId);
    await pool.query(
      `UPDATE teams SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
      values
    );
  }

  if (typeof anggota_ids !== 'undefined' && Array.isArray(anggota_ids)) {
    await pool.query(`DELETE FROM team_members WHERE team_id = $1`, [teamId]);
    for (const uid of anggota_ids) {
      await pool.query(
        `INSERT INTO team_members (team_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [teamId, uid]
      );
    }
  }

  const team = await loadTeam(teamId);
  if (!team) {
    return res.status(404).json({ message: 'Tim tidak ditemukan.' });
  }

  return res.json(team);
}

export async function destroy(req, res) {
  await pool.query(`DELETE FROM teams WHERE id = $1`, [req.params.team]);
  return res.json({ message: 'Tim dihapus.' });
}
