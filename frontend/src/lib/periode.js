import api from './api'

// Semester HANYA dipakai sebagai filter tanggal (Jan-Jun / Jul-Des) untuk melihat riwayat
// aktivitas dalam satu periode/tahun. Tugas & subtugas terikat ke `periode_id` (tahun),
// BUKAN ke semester, supaya progres yang sama bisa lanjut dari semester 1 ke semester 2
// tanpa reset. Reset hanya terjadi kalau memang pindah ke periode/tahun baru.

// semester: 0 = seluruh tahun (default), 1 = Jan-Jun, 2 = Jul-Des
export function semesterDariTanggal(date = new Date()) {
  return date.getMonth() < 6 ? 1 : 2
}

export function semesterLabel(semester) {
  if (!semester) return 'Seluruh Tahun'
  return `Semester ${semester} (${semester === 1 ? 'Jan-Jun' : 'Jul-Des'})`
}

export function periodeLabel(periode) {
  if (!periode) return '-'
  const semesterPart = periode.semester ? ` — ${semesterLabel(periode.semester)}` : ''
  return `Tahun ${periode.tahun}${semesterPart}`
}

// Ambil daftar periode (tahun anggaran) dari server.
export async function fetchPeriodes() {
  try {
    const res = await api.get('/periode')
    const data = res.data?.data || res.data
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Error fetching periodes:', err)
    return []
  }
}

// Kabalai membuka periode/tahun anggaran baru.
export async function createPeriode(tahun, catatan = null) {
  const res = await api.post('/periode', { tahun, catatan })
  return res.data
}

export async function aktifkanPeriode(periodeId) {
  const res = await api.post(`/periode/${periodeId}/aktifkan`)
  return res.data
}

export async function fetchHistoriSemester(periodeId) {
  const res = await api.get(`/periode/${periodeId}/histori-semester`)
  return res.data
}

export async function hapusPeriode(periodeId) {
  const res = await api.delete(`/periode/${periodeId}`)
  return res.data
}
