import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { fetchPeriodes, hapusPeriode as hapusPeriodeApi } from '../lib/periode'
import { useAuth } from './AuthContext.jsx'

const PeriodeContext = createContext(null)

// periode di context berbentuk: { periode_id, tahun, semester, status }
// - periode_id & tahun merujuk ke record `periodes` (tahun anggaran) di database.
// - semester: 0 = seluruh tahun, 1 = Jan-Jun, 2 = Jul-Des. Hanya filter tampilan/riwayat,
//   bukan partisi data -- progres tugas & subtugas tetap satu baris yang sama sepanjang tahun.
export function PeriodeProvider({ children }) {
  const { user } = useAuth()
  const [periodes, setPeriodes] = useState([])
  const [periode, setPeriodeState] = useState({ periode_id: null, tahun: null, semester: 0, status: null })
  const [loading, setLoading] = useState(true)

  const muatUlangPeriodes = useCallback(async () => {
    const data = await fetchPeriodes()
    setPeriodes(data)
    return data
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let aktif = true
    ;(async () => {
      try {
        const data = await muatUlangPeriodes()
        if (!aktif) return
        // default: periode aktif (kalau ada), fallback ke tahun terbaru
        const terpilih = data.find((p) => p.status === 'aktif') || data[0]
        if (terpilih) {
          setPeriodeState({
            periode_id: terpilih.id,
            tahun: terpilih.tahun,
            status: terpilih.status,
            // PENTING: default-nya "Seluruh Tahun" (0), BUKAN semester berdasarkan tanggal
            // hari ini. Kalau default ikut tanggal hari ini, sementara periode yang sedang
            // "aktif" di database tahunnya beda dari tahun kalender sekarang (mis. Kabalai
            // belum sempat buka periode tahun baru), maka tugas/subtugas yang BARU DIBUAT
            // (created_at = hari ini) akan langsung ke-filter hilang dari semua daftar &
            // dashboard karena tanggalnya jatuh di luar rentang semester periode lama itu --
            // walaupun datanya tersimpan benar di database (makanya masih bisa dibuka lewat
            // link notifikasi, yang tidak memfilter berdasarkan semester).
            semester: 0,
          })
        }
      } finally {
        if (aktif) setLoading(false)
      }
    })()
    return () => { aktif = false }
  }, [user, muatUlangPeriodes])

  // ganti periode (tahun) yang dipilih, lewat periode_id -- cari di state `periodes` yang ada
  function pilihPeriode(periodeId) {
    const p = periodes.find((x) => x.id === Number(periodeId))
    if (!p) return
    setPeriodeState((prev) => ({ ...prev, periode_id: p.id, tahun: p.tahun, status: p.status }))
  }

  // sama seperti pilihPeriode, tapi langsung terima objek periode (mis. hasil createPeriode),
  // supaya tidak perlu menunggu state `periodes` selesai di-refresh dulu sebelum bisa pindah.
  function pilihPeriodeObjek(p) {
    if (!p) return
    setPeriodeState((prev) => ({ ...prev, periode_id: p.id, tahun: p.tahun, status: p.status }))
  }

  // ganti filter semester (0 = seluruh tahun, 1, atau 2) untuk periode yang sedang dipilih
  function pilihSemester(semester) {
    setPeriodeState((prev) => ({ ...prev, semester: Number(semester) }))
  }

  // Hapus periode (tahun anggaran). Backend menolak kalau periode ini sedang aktif atau
  // masih punya tugas -- errornya dilempar balik supaya UI pemanggil bisa menampilkannya.
  async function hapusPeriode(periodeId) {
    await hapusPeriodeApi(periodeId)
    const data = await muatUlangPeriodes()
    // kalau yang dihapus adalah periode yang lagi dipilih, pindah ke periode aktif/terbaru lain
    if (periode.periode_id === Number(periodeId)) {
      const pengganti = data.find((p) => p.status === 'aktif') || data[0]
      if (pengganti) {
        setPeriodeState((prev) => ({ ...prev, periode_id: pengganti.id, tahun: pengganti.tahun, status: pengganti.status }))
      } else {
        setPeriodeState({ periode_id: null, tahun: null, semester: 0, status: null })
      }
    }
  }

  return (
    <PeriodeContext.Provider value={{ periode, periodes, loading, pilihPeriode, pilihPeriodeObjek, pilihSemester, muatUlangPeriodes, hapusPeriode }}>
      {children}
    </PeriodeContext.Provider>
  )
}

export function usePeriode() {
  return useContext(PeriodeContext)
}