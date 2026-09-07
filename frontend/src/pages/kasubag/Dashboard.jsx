import { useState } from 'react'
import api from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { usePeriode } from '../../context/PeriodeContext'
import StatCard from '../../components/StatCard'
import ProgressBar from '../../components/ProgressBar'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import { formatDate, daysUntil, statusBadgeClass } from '../../lib/helpers'
import { periodeLabel } from '../../lib/periode'
import HistoriSemesterCard from '../../components/HistoriSemesterCard'
import { Link } from 'react-router-dom'
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, CheckSquare } from 'lucide-react'

export default function Dashboard() {
  const { periode } = usePeriode()
  const [data, setData] = useState(null)

  useAutoRefresh(() => {
    api.get('/dashboard', { params: periode }).then((res) => setData(res.data))
  }, [periode])

  if (!data) return <Loading />
  const { ringkasan, progressPerTim, deadlineTerdekat, aktivitas, menungguVerifikasiTugas, menungguVerifikasiSubtugas } = data
  const totalMenunggu = (menungguVerifikasiTugas || 0) + (menungguVerifikasiSubtugas || 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard Kasubag</h1>
        <p className="text-sm text-gray-500">Ringkasan progres seluruh tim — {periodeLabel(periode)}.</p>
      </div>

      <HistoriSemesterCard periodeId={periode.periode_id} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tugas" value={ringkasan.total_tugas} icon={ClipboardList} color="brand" />
        <StatCard label="Sedang Berjalan" value={ringkasan.sedang_berjalan} icon={Clock} color="amber" />
        <StatCard label="Selesai" value={ringkasan.selesai} icon={CheckCircle2} color="emerald" />
        <StatCard label="Terlambat" value={ringkasan.terlambat} icon={AlertTriangle} color="red" />
      </div>

      {totalMenunggu > 0 && (
        <Link to="/kasubag/verifikasi" className="card p-4 flex items-center justify-between bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <CheckSquare className="text-amber-600" size={20} />
            <p className="text-sm font-medium text-amber-800">
              {menungguVerifikasiTugas} tugas & {menungguVerifikasiSubtugas} subtugas menunggu verifikasi akhir Anda.
            </p>
          </div>
          <span className="text-sm text-amber-700 font-medium">Buka →</span>
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-semibold text-gray-900 mb-5">Progress per Tim</h2>
          <div className="space-y-5">
            {progressPerTim.map((t) => (
              <Link
                key={t.team_id}
                to={`/kasubag/tugas?team_id=${t.team_id}`}
                className="block group"
              >
                <div className="text-sm font-medium text-gray-800 mb-1.5 group-hover:text-brand-600 transition-colors">
                  {t.nama_tim} <span className="text-gray-400 font-normal">· {t.katim}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={t.progress} />
                  </div>
                  <span className="text-sm text-gray-500 w-11 text-right tabular-nums">{t.progress}%</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Deadline Terdekat</h2>
          {!deadlineTerdekat?.length ? <EmptyState /> : (
            <div className="space-y-3">
              {deadlineTerdekat.map((t) => {
                const d = daysUntil(t.deadline)
                return (
                  <Link key={t.id} to={`/kasubag/tugas/${t.id}`} className="block border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                    <p className="text-sm font-medium text-gray-800">{t.judul}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${d < 0 ? 'text-red-600' : d <= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {d < 0 ? `Terlambat ${Math.abs(d)} hari` : `H-${d}`} · {formatDate(t.deadline)}
                      </span>
                      <span className={statusBadgeClass(t.status)}>{t.status}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h2>
        {!aktivitas?.length ? <EmptyState /> : (
          <div className="space-y-3">
            {aktivitas.slice(0, 5).map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className="text-gray-700"><span className="font-medium">{a.user?.name || 'Sistem'}</span> {a.aksi}</span>
                <span className="text-gray-400 text-xs">{formatDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}