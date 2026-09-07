import pool from '../db/pool.js';
import * as Semester from '../utils/semester.js';

// Bangun fragment SQL filter semester untuk tabel `tugas` (alias t).
// Semester 1|2 -> tugas yang "hidup" (dibuat ATAU ada update progres subtugas) pada rentang itu.
// PENTING: pakai rentang tanggal PENUH (termasuk tahun), bukan cuma EXTRACT(MONTH ..) --
// filter berbasis bulan saja tanpa tahun bisa salah ambil/lewatkan baris, sama seperti bug
// yang pernah bikin gauge histori semester kelihatan tidak berubah.
function semesterFilterTugas(semester, tahun, params) {
  if ((semester !== 1 && semester !== 2) || !tahun) return '';
  const [awalSemester, akhirSemester] = Semester.rentang(tahun, semester);
  params.push(awalSemester, akhirSemester);
  const i1 = params.length - 1;
  const i2 = params.length;
  return ` AND (t.created_at BETWEEN $${i1} AND $${i2} OR EXISTS (
      SELECT 1 FROM subtugas s2 JOIN subtugas_updates su2 ON su2.subtugas_id = s2.id
      WHERE s2.tugas_id = t.id AND su2.created_at BETWEEN $${i1} AND $${i2}
    ))`;
}

async function ringkasanTugas(periodeId, semester, extraWhere = '', extraParams = []) {
  const tahun = await Semester.periodeTahun(periodeId);
  const params = [periodeId, ...extraParams];
  const semFilter = semesterFilterTugas(semester, tahun, params);

  const { rows } = await pool.query(
    `SELECT
        COUNT(*)::int AS total_tugas,
        COUNT(*) FILTER (WHERE t.status = 'Sedang Berjalan')::int AS sedang_berjalan,
        COUNT(*) FILTER (WHERE t.status = 'Selesai')::int AS selesai,
        COUNT(*) FILTER (WHERE t.status = 'Terlambat')::int AS terlambat,
        COUNT(*) FILTER (WHERE t.status = 'Menunggu Verifikasi')::int AS menunggu_verifikasi
     FROM tugas t
     WHERE t.periode_id = $1 ${extraWhere} ${semFilter}`,
    params
  );

  return rows[0];
}

async function kabalaiKasubag(periodeId, semester, withVerifikasiQueue) {
  const ringkasanRow = await ringkasanTugas(periodeId, semester);
  const ringkasan = {
    total_tugas: ringkasanRow.total_tugas,
    sedang_berjalan: ringkasanRow.sedang_berjalan,
    selesai: ringkasanRow.selesai,
    terlambat: ringkasanRow.terlambat,
  };

  const tahun = await Semester.periodeTahun(periodeId);
  const teamParams = [periodeId];
  const semFilterForTeams = semesterFilterTugas(semester, tahun, teamParams);

  const { rows: progressPerTimRows } = await pool.query(
    `SELECT tm.id AS team_id, tm.nama_tim, tm.kode_tim, k.name AS katim_name,
        COUNT(t.id)::int AS total_tugas,
        COALESCE(ROUND(AVG(t.progress)::numeric, 1), 0) AS progress
     FROM teams tm
     JOIN users k ON k.id = tm.katim_id
     LEFT JOIN tugas t ON t.team_id = tm.id AND t.periode_id = $1 ${semFilterForTeams}
     GROUP BY tm.id, tm.nama_tim, tm.kode_tim, k.name
     ORDER BY tm.nama_tim`,
    teamParams
  );

  const progressPerTim = progressPerTimRows.map((r) => ({
    team_id: r.team_id,
    nama_tim: r.nama_tim,
    kode_tim: r.kode_tim,
    katim: r.katim_name || '-',
    progress: Number(r.progress),
    total_tugas: r.total_tugas,
  }));

  const deadlineParams = [periodeId];
  const semFilterDeadline = semesterFilterTugas(semester, tahun, deadlineParams);
  
  // UBAH 1: Pakai LEFT JOIN dan CASE WHEN supaya Tugas Umum tetap muncul di deadline dashboard
  const { rows: deadlineTerdekat } = await pool.query(
    `SELECT t.id, t.judul, t.deadline, t.status, t.progress, t.team_id,
        CASE WHEN tm.id IS NOT NULL THEN json_build_object('id', tm.id, 'nama_tim', tm.nama_tim, 'kode_tim', tm.kode_tim) ELSE NULL END AS team
     FROM tugas t
     LEFT JOIN teams tm ON tm.id = t.team_id
     WHERE t.periode_id = $1 AND t.status != 'Selesai' AND t.deadline IS NOT NULL ${semFilterDeadline}
     ORDER BY t.deadline ASC
     LIMIT 6`,
    deadlineParams
  );

  const { rows: aktivitas } = await pool.query(
    `SELECT a.*, json_build_object('id', u.id, 'name', u.name) AS user
     FROM activity_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT 10`
  );

  const result = { ringkasan, progressPerTim, deadlineTerdekat, aktivitas };

  if (withVerifikasiQueue) {
    result.menungguVerifikasiTugas = ringkasanRow.menunggu_verifikasi;

    const { rows: subCountRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM subtugas s
       JOIN tugas t ON t.id = s.tugas_id
       WHERE t.periode_id = $1 AND s.status = 'Menunggu Verifikasi Kasubag'`,
      [periodeId]
    );
    result.menungguVerifikasiSubtugas = subCountRows[0].total;
  }

  return result;
}

async function katim(user, periodeId, semester) {
  const { rows: teamRows } = await pool.query(`SELECT * FROM teams WHERE katim_id = $1 LIMIT 1`, [
    user.id,
  ]);
  const team = teamRows[0];

  if (!team) {
    return {
      ringkasan: { total_tugas: 0, sedang_berjalan: 0, selesai: 0, terlambat: 0 },
      subtugasTerlambat: [],
      menungguVerifikasi: 0,
      deadlineTerdekat: [],
      anggotaBelumUpdate: [],
    };
  }

  const tahun = await Semester.periodeTahun(periodeId);
  // UBAH 2: Tambahkan "OR t.team_id IS NULL" agar Tugas Umum terhitung di ringkasan Katim
  const ringkasanRow = await ringkasanTugas(periodeId, semester, 'AND (t.team_id = $2 OR t.team_id IS NULL)', [team.id]);
  const ringkasan = {
    total_tugas: ringkasanRow.total_tugas,
    sedang_berjalan: ringkasanRow.sedang_berjalan,
    selesai: ringkasanRow.selesai,
    terlambat: ringkasanRow.terlambat,
  };

  const { rows: tugasIdRows } = await pool.query(
    `SELECT id FROM tugas WHERE (team_id = $1 OR team_id IS NULL) AND periode_id = $2`,
    [team.id, periodeId]
  );
  const tugasIds = tugasIdRows.map((r) => r.id);

  // UBAH 3: Ambil ID Anggota dari Katim ini supaya subtugas bisa difilter
  const { rows: memberRows } = await pool.query(
    `SELECT user_id FROM team_members WHERE team_id = $1`,
    [team.id]
  );
  // Masukkan juga ID Katim itu sendiri jika Katim ikut mengerjakan subtugas
  const memberIds = memberRows.map(m => m.user_id);
  memberIds.push(user.id);

  let subtugasTerlambat = [];
  let menungguVerifikasi = 0;
  let anggotaBelumUpdate = [];

  if (tugasIds.length > 0 && memberIds.length > 0) {
    // Tambahkan filter "AND s.assigned_to = ANY($2::bigint[])" agar aman dari subtugas tim lain
    const { rows } = await pool.query(
      `SELECT s.*, json_build_object('id', u.id, 'name', u.name) AS assignee
       FROM subtugas s JOIN users u ON u.id = s.assigned_to
       WHERE s.tugas_id = ANY($1::bigint[]) AND s.assigned_to = ANY($2::bigint[]) AND s.status = 'Terlambat'`,
      [tugasIds, memberIds]
    );
    subtugasTerlambat = rows;

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM subtugas
       WHERE tugas_id = ANY($1::bigint[]) AND assigned_to = ANY($2::bigint[]) AND status = 'Menunggu Verifikasi Katim'`,
      [tugasIds, memberIds]
    );
    menungguVerifikasi = countRows[0].total;

    const { rows: belumRows } = await pool.query(
      `SELECT s.id, s.judul, s.assigned_to, s.deadline,
          json_build_object('id', u.id, 'name', u.name) AS assignee
       FROM subtugas s JOIN users u ON u.id = s.assigned_to
       WHERE s.tugas_id = ANY($1::bigint[]) AND s.assigned_to = ANY($2::bigint[]) AND s.status = 'Belum Dimulai'`,
      [tugasIds, memberIds]
    );
    anggotaBelumUpdate = belumRows;
  }

  const deadlineParams = [periodeId, team.id];
  const semFilterDeadline = semesterFilterTugas(semester, tahun, deadlineParams);
  // Pastikan deadline mengambil Tugas Umum juga
  const { rows: deadlineTerdekat } = await pool.query(
    `SELECT t.id, t.judul, t.deadline, t.status, t.progress
     FROM tugas t
     WHERE t.periode_id = $1 AND (t.team_id = $2 OR t.team_id IS NULL) AND t.status != 'Selesai' AND t.deadline IS NOT NULL ${semFilterDeadline}
     ORDER BY t.deadline ASC
     LIMIT 6`,
    deadlineParams
  );

  return { ringkasan, subtugasTerlambat, menungguVerifikasi, deadlineTerdekat, anggotaBelumUpdate };
}

async function anggota(user, periodeId, semester) {
  const params = [user.id, periodeId];
  let semFilter = '';

  if (semester === 1 || semester === 2) {
      // PENTING: pakai rentang tanggal PENUH (termasuk tahun periode ini), bukan cuma
      // EXTRACT(MONTH ..) -- lihat catatan di semesterFilterTugas() di atas.
      const tahun = await Semester.periodeTahun(periodeId);
      if (tahun) {
        const [awalSemester, akhirSemester] = Semester.rentang(tahun, semester);
        params.push(awalSemester, akhirSemester);
        const i1 = params.length - 1;
        const i2 = params.length;
        semFilter = ` AND (s.created_at BETWEEN $${i1} AND $${i2} OR EXISTS (
            SELECT 1 FROM subtugas_updates su WHERE su.subtugas_id = s.id AND su.created_at BETWEEN $${i1} AND $${i2}
          ))`;
      }
    }

  const { rows: ringkasanRows } = await pool.query(
    `SELECT
        COUNT(*)::int AS total_subtugas,
        COUNT(*) FILTER (WHERE s.status = 'Sedang Berjalan')::int AS sedang_berjalan,
        COUNT(*) FILTER (WHERE s.status = 'Selesai')::int AS selesai,
        COUNT(*) FILTER (WHERE s.status = 'Terlambat')::int AS terlambat
     FROM subtugas s
     JOIN tugas t ON t.id = s.tugas_id
     WHERE s.assigned_to = $1 AND t.periode_id = $2 ${semFilter}`,
    params
  );

  const { rows: deadlineTerdekat } = await pool.query(
    `SELECT s.*, json_build_object('id', t.id, 'judul', t.judul) AS tugas
     FROM subtugas s
     JOIN tugas t ON t.id = s.tugas_id
     WHERE s.assigned_to = $1 AND t.periode_id = $2 AND s.status != 'Selesai' AND s.deadline IS NOT NULL ${semFilter}
     ORDER BY s.deadline ASC
     LIMIT 6`,
    params
  );

  return { ringkasan: ringkasanRows[0], deadlineTerdekat };
}

export async function index(req, res) {
  const user = req.user;
  const { periode_id: periodeId, semester } = await Semester.fromRequest(req);

  if (!periodeId) {
    return res.status(422).json({ message: 'Belum ada periode aktif.' });
  }

  let result;
  switch (user.role) {
    case 'kabalai':
      result = await kabalaiKasubag(periodeId, semester, false);
      break;
    case 'kasubag':
      result = await kabalaiKasubag(periodeId, semester, true);
      break;
    case 'katim':
      result = await katim(user, periodeId, semester);
      break;
    case 'anggota':
      result = await anggota(user, periodeId, semester);
      break;
    default:
      return res.status(422).json({ message: 'Role tidak dikenali.' });
  }

  return res.json(result);
}