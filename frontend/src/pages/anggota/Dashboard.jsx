import { useState } from 'react'
import api from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { usePeriode } from '../../context/PeriodeContext'
import StatCard from '../../components/StatCard'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import { formatDate, daysUntil, statusBadgeClass } from '../../lib/helpers'
import { periodeLabel } from '../../lib/periode'
import { Link } from 'react-router-dom'
import { ClipboardList, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function Dashboard() {
  const { periode } = usePeriode()
  const [data, setData] = useState(null)

  useAutoRefresh(() => {
    api.get('/dashboard', { params: periode }).then((res) => setData(res.data))
  }, [periode?.periode_id, periode?.tahun, periode?.semester])

  if (!data) return <Loading />
  const { ringkasan, deadlineTerdekat } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard Saya</h1>
        <p className="text-sm text-gray-500">{periodeLabel(periode)}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Subtugas" value={ringkasan.total_subtugas} icon={ClipboardList} color="brand" />
        <StatCard label="Sedang Berjalan" value={ringkasan.sedang_berjalan} icon={Clock} color="amber" />
        <StatCard label="Selesai" value={ringkasan.selesai} icon={CheckCircle2} color="emerald" />
        <StatCard label="Terlambat" value={ringkasan.terlambat} icon={AlertTriangle} color="red" />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Deadline Terdekat</h2>
        {!deadlineTerdekat?.length ? <EmptyState text="Tidak ada subtugas mendekati deadline." /> : (
          <div className="space-y-3">
            {deadlineTerdekat.map((s) => {
              const d = daysUntil(s.deadline)
              return (
                <Link key={s.id} to={`/anggota/subtugas/${s.id}`} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.judul}</p>
                    <p className="text-xs text-gray-400">{s.tugas?.judul}</p>
                  </div>
                  <div className="text-right">
                    <span className={statusBadgeClass(s.status)}>{s.status}</span>
                    <p className={`text-xs mt-1 ${d < 0 ? 'text-red-600' : d <= 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {d < 0 ? `Terlambat ${Math.abs(d)} hari` : `H-${d}`}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}