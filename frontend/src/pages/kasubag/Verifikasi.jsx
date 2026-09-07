import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { Link } from 'react-router-dom'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import SubtugasRow from '../../components/SubtugasRow'
import ProgressBar from '../../components/ProgressBar'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function Verifikasi() {
  const [data, setData] = useState(null)
  const [noteByTugas, setNoteByTugas] = useState({})

  function load() {
    api.get('/verifikasi/antrian-kasubag').then((res) => setData(res.data))
  }

  useEffect(() => { load() }, [])

  async function verifikasiTugas(id, keputusan) {
    const catatan = noteByTugas[id] || ''
    if (keputusan === 'ditolak' && !catatan.trim()) {
      alert('Wajib isi catatan alasan pengembalian.')
      return
    }
    await api.post(`/tugas/${id}/verifikasi`, { keputusan, catatan })
    load()
  }

  if (!data) return <Loading />
  const { subtugas, tugas } = data

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Verifikasi (Tahap 2 — Final)</h1>
        <p className="text-sm text-gray-500">Double-check subtugas yang sudah disetujui Katim, dan verifikasi akhir tugas.</p>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Subtugas Menunggu Verifikasi Kasubag ({subtugas.length})</h2>
        {!subtugas.length ? <EmptyState text="Tidak ada subtugas yang menunggu." /> : (
          <div className="space-y-4">
            {subtugas.map((s) => (
              <div key={s.id}>
                <p className="text-xs text-gray-400 mb-1">Tugas: {s.tugas?.judul} · Tim: {s.tugas?.team?.nama_tim}</p>
                <SubtugasRow subtugas={s} role="kasubag" onChanged={load} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Tugas Menunggu Verifikasi Akhir ({tugas.length})</h2>
        {!tugas.length ? <EmptyState text="Tidak ada tugas yang menunggu." /> : (
          <div className="space-y-4">
            {tugas.map((t) => (
              <div key={t.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <Link to={`/kasubag/tugas/${t.id}`} className="font-medium text-gray-900 hover:underline">{t.judul}</Link>
                    <p className="text-xs text-gray-500">Tim: {t.team?.nama_tim} · Katim: {t.team?.katim?.name}</p>
                  </div>
                </div>
                <div className="mt-2"><ProgressBar value={t.progress} /></div>
                <textarea
                  className="input mt-3" rows={2} placeholder="Catatan (wajib jika dikembalikan)"
                  value={noteByTugas[t.id] || ''}
                  onChange={(e) => setNoteByTugas({ ...noteByTugas, [t.id]: e.target.value })}
                />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => verifikasiTugas(t.id, 'disetujui')} className="btn btn-success text-sm"><CheckCircle2 size={15} /> Verifikasi</button>
                  <button onClick={() => verifikasiTugas(t.id, 'ditolak')} className="btn btn-danger text-sm"><XCircle size={15} /> Kembalikan</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
