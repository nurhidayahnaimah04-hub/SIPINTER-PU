import { useState } from 'react'
import { usePeriode } from '../context/PeriodeContext'
import { useAuth } from '../context/AuthContext.jsx'
import { createPeriode } from '../lib/periode'
import { Calendar, Plus, Trash2, AlertTriangle } from 'lucide-react'

// Pemilih Periode (tahun anggaran) + filter Semester.
// - Dropdown Periode: daftar tahun anggaran yang sudah dibuat Kabalai (data asli dari DB,
//   bukan dihitung dari tanggal hari ini), jadi bisa ditambah tahun baru kapan pun.
// - Dropdown Semester: hanya filter tampilan (Seluruh Tahun / Semester 1 / Semester 2),
//   TIDAK mereset atau memisahkan data -- progres tetap satu baris yang sama sepanjang tahun.
// - Panel "+ Periode" hanya muncul untuk Kabalai: bisa membuka tahun anggaran baru,
//   dan menghapus periode yang salah buat (periode aktif / yang masih ada tugasnya ditolak backend).
export default function PeriodeSelector() {
  const { periode, periodes, pilihPeriode, pilihPeriodeObjek, pilihSemester, muatUlangPeriodes, hapusPeriode } = usePeriode()
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [tahunBaru, setTahunBaru] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleBuatPeriode(e) {
    e.preventDefault()
    setError('')
    const tahun = Number(tahunBaru)
    if (!tahun || tahun < 2020 || tahun > 2100) {
      setError('Masukkan tahun yang valid.')
      return
    }
    setSaving(true)
    try {
      const baru = await createPeriode(tahun)   // response ini sudah punya id, tahun, status
      await muatUlangPeriodes()                  // refresh daftar dropdown
      pilihPeriodeObjek(baru)                     // langsung pindah pakai objek yang baru dibuat, bukan cari di state basi
      setShowForm(false)
      setTahunBaru('')
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat periode baru.')
    } finally {
      setSaving(false)
    }
  }

  function openDelete(p) {
    setDeleteError('')
    setDeleteTarget(p)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await hapusPeriode(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus periode.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Tahun */}
      <div className="relative">
        <Calendar
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />

        <select
          className="
            h-9
            w-48
            rounded-xl
            border
            border-gray-300
            bg-white
            pl-10
            pr-8
            text-sm
            shadow-sm
            hover:border-gray-400
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            transition
          "
          value={periode.periode_id ?? ""}
          onChange={(e) => pilihPeriode(e.target.value)}
        >
          {periodes.map((p) => (
            <option key={p.id} value={p.id}>
              Tahun {p.tahun}
              {p.status === "aktif" ? " (Aktif)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Semester */}
      <select
        className="
          h-9
          w-40
          rounded-xl
          border
          border-gray-300
          bg-white
          px-2
          text-sm
          shadow-sm
          hover:border-gray-400
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          transition
        "
        value={periode.semester}
        onChange={(e) => pilihSemester(e.target.value)}
      >
        <option value={0}>Seluruh Tahun</option>
        <option value={1}>Semester 1 (Jan–Jun)</option>
        <option value={2}>Semester 2 (Jul–Des)</option>
      </select>

      {user?.role === "kabalai" && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="h-9 px-3 rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition flex items-center gap-2"
          >
            <Plus size={17} />
            <span>Periode</span>
          </button>

          {showForm && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20">
              {/* Daftar periode yang ada + tombol hapus */}
              <p className="text-xs font-medium text-gray-500 mb-2">Periode yang sudah dibuat</p>
              <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                {periodes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-gray-50">
                    <span className="text-gray-700">
                      Tahun {p.tahun} {p.status === 'aktif' && <span className="text-green-600 font-medium">(Aktif)</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => openDelete(p)}
                      title={p.status === 'aktif' ? 'Periode aktif tidak bisa dihapus' : 'Hapus periode ini'}
                      className="text-gray-300 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <form onSubmit={handleBuatPeriode} className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Tahun Anggaran Baru</label>
                    <input
                      type="number"
                      className="input w-full"
                      placeholder="contoh: 2027"
                      value={tahunBaru}
                      onChange={(e) => setTahunBaru(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setError('') }}
                      className="px-3 py-1.5 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
                      disabled={saving}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                      disabled={saving}
                    >
                      {saving ? 'Menyimpan...' : 'Buat Periode'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal konfirmasi hapus periode */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl">Hapus Periode</div>
            <div className="p-6 space-y-4">
              {deleteError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{deleteError}</div>}
              <div className="flex items-start gap-3 bg-red-50 text-red-700 rounded-lg px-4 py-3">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  Yakin ingin menghapus periode <span className="font-semibold">Tahun {deleteTarget.tahun}</span>?
                  Periode yang sedang aktif atau masih punya tugas tidak bisa dihapus.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Batal
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Menghapus...' : 'Ya, Hapus Periode'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}