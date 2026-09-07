import pool from '../db/pool.js';
import * as Semester from '../utils/semester.js';
import * as ActivityLog from '../utils/activityLog.js';

export async function index(req, res) {
  const { rows } = await pool.query(
    `SELECT p.*, COALESCE(t.total, 0)::int AS tugas_count
     FROM periodes p
     LEFT JOIN (SELECT periode_id, COUNT(*) AS total FROM tugas GROUP BY periode_id) t
       ON t.periode_id = p.id
     ORDER BY p.tahun DESC`
  );
  return res.json(rows);
}

export async function store(req, res) {
  const { tahun, catatan = null } = req.body || {};

  if (!tahun || tahun < 2020 || tahun > 2100) {
    return res.status(422).json({ message: 'Tahun tidak valid.' });
  }

  const { rows: existing } = await pool.query(`SELECT id FROM periodes WHERE tahun = $1`, [tahun]);
  if (existing.length > 0) {
    return res.status(422).json({
      message: 'The given data was invalid.',
      errors: { tahun: ['Tahun ini sudah pernah dibuat.'] },
    });
  }

  const { rows } = await pool.query(
    `INSERT INTO periodes (tahun, status, catatan, dibuat_oleh) VALUES ($1,'aktif',$2,$3) RETURNING *`,
    [tahun, catatan, req.user.id]
  );
  const periode = rows[0];

  await pool.query(
    `UPDATE periodes SET status = 'ditutup', ditutup_at = now() WHERE status = 'aktif' AND id != $1`,
    [periode.id]
  );

  await ActivityLog.catat(req.user.id, `membuka periode tahun ${periode.tahun}`, 'periode', periode.id);

  return res.status(201).json(periode);
}

export async function aktifkan(req, res) {
  const periodeId = req.params.periode;

  await pool.query(
    `UPDATE periodes SET status = 'ditutup', ditutup_at = now() WHERE status = 'aktif' AND id != $1`,
    [periodeId]
  );

  const { rows } = await pool.query(
    `UPDATE periodes SET status = 'aktif', ditutup_at = NULL, updated_at = now() WHERE id = $1 RETURNING *`,
    [periodeId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Periode tidak ditemukan.' });
  }

  await ActivityLog.catat(
    req.user.id,
    `mengaktifkan kembali periode tahun ${rows[0].tahun}`,
    'periode',
    periodeId
  );

  return res.json(rows[0]);
}

export async function historiSemester(req, res) {
  const periodeId = req.params.periode;

  const { rows: periodeRows } = await pool.query(`SELECT * FROM periodes WHERE id = $1`, [periodeId]);
  const periode = periodeRows[0];
  if (!periode) {
    return res.status(404).json({ message: 'Periode tidak ditemukan.' });
  }

  const hasil = [];

  for (const semester of [1, 2]) {
    // PENTING: pakai rentang tanggal PENUH (termasuk tahun periode ini), bukan cuma
    // EXTRACT(MONTH ..) -- filter berbasis bulan saja tanpa tahun bisa salah ambil/lewatkan
    // baris subtugas_updates, jadi gauge kelihatan tidak berubah walau ada update baru.
    const [awalSemester, akhirSemester] = Semester.rentang(periode.tahun, semester);

    const { rows: tugasIdRows } = await pool.query(`SELECT id FROM tugas WHERE periode_id = $1`, [
      periode.id,
    ]);
    const tugasIds = tugasIdRows.map((r) => r.id);

    let subtugasIds = [];
    if (tugasIds.length > 0) {
      const { rows: subtugasIdRows } = await pool.query(
        `SELECT id FROM subtugas WHERE tugas_id = ANY($1::bigint[])`,
        [tugasIds]
      );
      subtugasIds = subtugasIdRows.map((r) => r.id);
    }

    let rataRata = 0;
    let subtugasSelesai = 0;

    if (subtugasIds.length > 0) {
      // Progres tiap subtugas per akhir semester ybs = update terakhir yang dikirim
      // sebelum/sampai tanggal akhir semester itu (kalau belum ada update, 0).
      const { rows: latestPerSubtugas } = await pool.query(
        `SELECT DISTINCT ON (subtugas_id) subtugas_id, persentase
         FROM subtugas_updates
         WHERE subtugas_id = ANY($1::bigint[])
           AND created_at BETWEEN $2 AND $3
         ORDER BY subtugas_id, created_at DESC`,
        [subtugasIds, awalSemester, akhirSemester]
      );

      // Rata-rata dihitung atas SEMUA subtugas di periode ini (bukan cuma yang sudah
      // punya riwayat) -- subtugas yang belum pernah di-update dianggap 0%.
      const progressMap = new Map(
        latestPerSubtugas.map((r) => [r.subtugas_id, Number(r.persentase)])
      );
      const total = subtugasIds.reduce((s, id) => s + (progressMap.get(id) || 0), 0);
      rataRata = Math.round((total / subtugasIds.length) * 10) / 10;

      // Dihitung di LEVEL SUBTUGAS (bukan tugas), supaya tugas yang subtugasnya
      // sebagian sudah selesai tetap kelihatan progresnya, tanpa perlu menunggu
      // SELURUH subtugas dalam 1 tugas itu rampung dulu baru terhitung.
      // "Selesai" di sini = progres sudah mencapai 100% pada saat itu, terlepas
      // dari status verifikasi (supaya tetap tercatat walau masih antre verifikasi).
     subtugasSelesai = subtugasIds.filter((id) => (progressMap.get(id) || 0) >= 100).length;
    }

    const persentaseSelesai =
      subtugasIds.length > 0 ? Math.round((subtugasSelesai / subtugasIds.length) * 1000) / 10 : 0;

    hasil.push({
      semester,
      label: Semester.label(periode.tahun, semester),
      rata_rata_progress_akhir_semester: rataRata,
      persentase_selesai: persentaseSelesai,
      jumlah_tugas: tugasIds.length,
      jumlah_subtugas: subtugasIds.length,
      subtugas_selesai: subtugasSelesai,
    });
  }

  return res.json({ periode, histori: hasil });
}

  export async function destroy(req, res) {
  const periodeId = req.params.periode;

  const { rows: periodeRows } = await pool.query(`SELECT * FROM periodes WHERE id = $1`, [periodeId]);
  const periode = periodeRows[0];
  if (!periode) {
    return res.status(404).json({ message: 'Periode tidak ditemukan.' });
  }

  if (periode.status === 'aktif') {
    return res.status(422).json({
      message: 'Periode yang sedang aktif tidak bisa dihapus. Aktifkan periode lain dulu, baru hapus periode ini.',
    });
  }

  const { rows: tugasRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM tugas WHERE periode_id = $1`, [
    periodeId,
  ]);
  if (tugasRows[0].total > 0) {
    return res.status(422).json({
      message: `Periode ini masih memiliki ${tugasRows[0].total} tugas. Hapus atau pindahkan tugas tersebut dulu sebelum menghapus periode ini.`,
    });
  }

  await pool.query(`DELETE FROM periodes WHERE id = $1`, [periodeId]);

  await ActivityLog.catat(req.user.id, `menghapus periode tahun ${periode.tahun}`, 'periode', periodeId);

  return res.json({ message: 'Periode dihapus.' });
}