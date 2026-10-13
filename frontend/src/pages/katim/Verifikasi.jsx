import { useEffect, useState } from 'react'
import api from '../../lib/api'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import SubtugasRow from '../../components/SubtugasRow'

export default function Verifikasi() {
  const [items, setItems] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  function load() {
    setErrorMsg(null)
    api.get('/verifikasi/antrian-katim')
      .then((res) => setItems(res.data))
      .catch((err) => {
        console.error("Gagal memuat antrian:", err)
        setErrorMsg(err.response?.data?.message || 'Gagal memuat data verifikasi dari server.')
        setItems([]) // Set ke array kosong agar loading berhenti
      })
  }

  useEffect(() => { load() }, [])

  if (!items && !errorMsg) return <Loading />

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Verifikasi Subtugas (Tahap 1)</h1>
      <p className="text-sm text-gray-500 mb-6">Subtugas anggota tim Anda yang menunggu verifikasi.</p>

      {errorMsg && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {errorMsg}
        </div>
      )}

      {!items?.length && !errorMsg ? (
        <EmptyState text="Tidak ada subtugas yang menunggu verifikasi." />
      ) : (
        <div className="space-y-4">
          {items?.map((s) => (
            <div key={s.id}>
              <p className="text-xs text-gray-400 mb-1">Tugas: {s.tugas?.judul}</p>
              <SubtugasRow subtugas={s} role="katim" onChanged={load} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}