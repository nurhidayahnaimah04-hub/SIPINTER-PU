import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { usePeriode } from '../../context/PeriodeContext'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import { statusBadgeClass } from '../../lib/helpers'

export default function MyTeam() {
  const { periode } = usePeriode()
  const [team, setTeam] = useState(null)
  const [subtugasList, setSubtugasList] = useState([])

  useEffect(() => {
    api.get('/teams').then(async (res) => {
      const t = res.data[0]
      setTeam(t)
      if (t) {
        const tugasList = await api.get('/tugas', { params: periode }).then((r) => r.data.data)
        const detailed = await Promise.all(tugasList.map((tg) => api.get(`/tugas/${tg.id}`).then((r) => r.data)))
        setSubtugasList(detailed.flatMap((tg) => tg.subtugas || []))
      }
    })
  }, [periode])

  if (!team) return <Loading />

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Tim Saya</h1>
      <p className="text-sm text-gray-500 mb-6">{team.nama_tim} {team.kode_tim && `(${team.kode_tim})`} · {team.members?.length || 0} anggota</p>

      {!team.members?.length ? <EmptyState text="Belum ada anggota di tim ini." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {team.members.map((m) => {
            const tasks = subtugasList.filter((s) => s.assigned_to === m.id)
            const avg = tasks.length ? Math.round(tasks.reduce((a, s) => a + Number(s.progress), 0) / tasks.length) : 0
            return (
              <div key={m.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">{m.name.charAt(0)}</div>
                  <div>
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.jabatan}</p>
                  </div>
                  <span className="ml-auto text-sm font-semibold text-brand-700">{avg}%</span>
                </div>
                <div className="mt-3 space-y-2">
                  {tasks.length === 0 ? <p className="text-xs text-gray-400">Belum ada subtugas periode ini.</p> : tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate">{t.judul}</span>
                      <span className={statusBadgeClass(t.status)}>{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
