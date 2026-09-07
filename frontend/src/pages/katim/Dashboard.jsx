import { useState } from 'react'
import api from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { usePeriode } from '../../context/PeriodeContext'
import StatCard from '../../components/StatCard'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import { formatDate, daysUntil } from '../../lib/helpers'
import { periodeLabel } from '../../lib/periode'
import { Link } from 'react-router-dom'
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, CheckSquare } from 'lucide-react'

export default function Dashboard() {
  const { periode } = usePeriode()
  const [data, setData] = useState(null)

  useAutoRefresh(() => {
    api.get('/dashboard', { params: periode }).then((res) => setData(res.data))
  }, [periode])

  if (!data) return <Loading />
  const { ringkasan, subtugasTerlambat, menungguVerifikasi, deadlineTerdekat, anggotaBelumUpdate } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard Kepala Tim</h1>
        <p className="text-sm text-gray-500">Tim Anda — {periodeLabel(periode)}.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tugas Tim" value={ringkasan.total_tugas} icon={ClipboardList} color="brand" />
        <StatCard label="Sedang Berjalan" value={ringkasan.sedang_berjalan} icon={Clock} color="amber" />
        <StatCard label="Selesai" value={ringkasan.selesai} icon={CheckCircle2} color="emerald" />
        <StatCard label="Terlambat" value={ringkasan.terlambat} icon={AlertTriangle} color="red" />
      </div>

      {menungguVerifikasi > 0 && (
        <Link to="/katim/verifikasi" className="card p-4 flex items-center justify-between bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <CheckSquare className="text-amber-600" size={20} />
            <p className="text-sm font-medium text-amber-800">{menungguVerifikasi} subtugas anggota menunggu verifikasi Anda.</p>
          </div>
          <span className="text-sm text-amber-700 font-medium">Buka →</span>
        </Link>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Deadline Terdekat Tim</h2>
          {!deadlineTerdekat?.length ? <EmptyState /> : (
            <div className="space-y-3">
              {deadlineTerdekat.map((t) => {
                const d = daysUntil(t.deadline)
                return (
                  <Link key={t.id} to={`/katim/tugas/${t.id}`} className="block border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                    <p className="text-sm font-medium text-gray-800">{t.judul}</p>
                    <span className={`text-xs ${d < 0 ? 'text-red-600' : d <= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {d < 0 ? `Terlambat ${Math.abs(d)} hari` : `H-${d}`} · {formatDate(t.deadline)}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Anggota Belum Mulai Update</h2>
          {!anggotaBelumUpdate?.length ? <EmptyState text="Semua anggota sudah update." /> : (
            <div className="space-y-3">
              {anggotaBelumUpdate.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.judul}</p>
                    <p className="text-xs text-gray-400">{s.assignee?.name}</p>
                  </div>
                  {s.deadline && <span className="text-xs text-gray-400">{formatDate(s.deadline)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {subtugasTerlambat?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-red-700">Subtugas Terlambat</h2>
          <div className="space-y-2">
            {subtugasTerlambat.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{s.judul} — {s.assignee?.name}</span>
                {s.deadline && <span className="text-red-600 text-xs">{formatDate(s.deadline)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}