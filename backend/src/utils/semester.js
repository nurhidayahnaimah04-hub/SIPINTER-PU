import pool from '../db/pool.js';

/**
 * Semester HANYA dipakai sebagai lensa tanggal (Jan-Jun / Jul-Des) untuk memfilter
 * riwayat (subtugas_updates) atau menentukan label tampilan. Semester TIDAK menjadi
 * kolom/partisi data pada tabel tugas -- itulah yang membuat progres bisa berlanjut
 * dari semester 1 ke semester 2 selama masih di periode/tahun yang sama.
 */

export function dariTanggal(date) {
  return date.getMonth() + 1 <= 6 ? 1 : 2;
}

export function saatIni() {
  return dariTanggal(new Date());
}

/**
 * Rentang tanggal [awal, akhir] untuk tahun & semester tertentu.
 * @returns {[Date, Date]}
 */
export function rentang(tahun, semester) {
  if (semester === 1) {
    return [new Date(Date.UTC(tahun, 0, 1, 0, 0, 0)), new Date(Date.UTC(tahun, 5, 30, 23, 59, 59))];
  }
  return [new Date(Date.UTC(tahun, 6, 1, 0, 0, 0)), new Date(Date.UTC(tahun, 11, 31, 23, 59, 59))];
}

export function monthRange(semester) {
  return semester === 1 ? [1, 6] : [7, 12];
}

export function label(tahun, semester) {
  return `Semester ${semester} ${tahun} (${semester === 1 ? 'Jan-Jun' : 'Jul-Des'})`;
}

export async function periodeAktifSaatIni() {
  const { rows } = await pool.query(
    `SELECT * FROM periodes WHERE status = 'aktif' ORDER BY tahun DESC LIMIT 1`
  );
  return rows[0] || null;
}

/**
 * Ambil periode_id & semester dari request:
 * - periode_id: fallback ke periode aktif kalau tidak dikirim.
 * - semester: 0 (atau tidak dikirim) = seluruh tahun, 1|2 = semester spesifik.
 */
export async function fromRequest(req) {
  let periodeId = req.query.periode_id;

  if (!periodeId) {
    const aktif = await periodeAktifSaatIni();
    periodeId = aktif?.id ?? null;
  }

  return {
    periode_id: periodeId ? Number(periodeId) : null,
    semester: Number(req.query.semester || 0),
  };
}

export async function periodeTahun(periodeId) {
  const { rows } = await pool.query(`SELECT tahun FROM periodes WHERE id = $1`, [periodeId]);
  return rows[0]?.tahun ?? null;
}
