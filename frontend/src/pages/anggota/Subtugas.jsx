import { useState } from 'react'
import api from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { usePeriode } from '../../context/PeriodeContext'
import { Link } from 'react-router-dom'
import ProgressBar from '../../components/ProgressBar'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import { formatDate, statusBadgeClass } from '../../lib/helpers'

const STATUSES = ['Belum Dimulai', 'Sedang Berjalan', 'Menunggu Verifikasi Katim', 'Menunggu Verifikasi Kasubag', 'Selesai', 'Terlambat']

export default function Subtugas() {
  const { periode } = usePeriode()
  const [items, setItems] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  useAutoRefresh(() => {
    api
      .get('/subtugas', {
        params: {
          status: statusFilter,
          periode_id: periode.periode_id,
          semester: periode.semester,
        },
      })
      .then((res) => setItems(res.data))
      .catch(() => setItems((prev) => prev ?? []))
  }, [statusFilter, periode.periode_id, periode.semester])

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Subtugas Saya</h1>
      <p className="text-sm text-gray-500 mb-4">Subtugas yang ditugaskan kepada Anda (dari Katim maupun Kasubag).</p>

      <select className="input sm:w-64 mb-4" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">Semua Status</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {!items ? <Loading /> : !items.length ? <EmptyState text="Belum ada subtugas pada periode ini." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((t) => (
            <Link key={t.id} to={`/anggota/subtugas/${t.id}`} className="card p-5 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900">{t.judul}</h3>
              <p className="text-sm text-gray-500 mt-1">{t.tugas?.judul}</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progress</span><span>{t.progress}%</span></div>
                <ProgressBar value={t.progress} />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={statusBadgeClass(t.status)}>{t.status}</span>
                {t.deadline && <span className="text-xs text-gray-400">Deadline: {formatDate(t.deadline)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}