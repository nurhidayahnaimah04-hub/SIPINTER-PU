import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios.js'
import Navbar from '../components/Navbar.jsx'
import StatCard from '../components/StatCard.jsx'
import StatusDot from '../components/StatusDot.jsx'
import MiniProgress from '../components/MiniProgress.jsx'

export default function KepalaBalaiDashboard() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState({})

  useEffect(() => {
    api
      .get('/dashboard/kepala-balai')
      .then((res) => setTeams(res.data))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const totalPekerjaan = teams.reduce(
      (sum, t) => sum + t.uraian_tugas.reduce((s, u) => s + u.jumlah_pekerjaan, 0),
      0,
    )
    const avgProgress = teams.length
      ? Math.round(teams.reduce((s, t) => s + t.progress_keseluruhan, 0) / teams.length)
      : 0
    return { totalTim: teams.length, totalPekerjaan, avgProgress }
  }, [teams])

  function toggle(teamId) {
    setCollapsed((prev) => ({ ...prev, [teamId]: !prev[teamId] }))
  }

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="p-8 text-center text-gray-500">Memuat data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-pupr-blue-dark mb-1">
            Progress Pekerjaan Ketua Tim
          </h1>
          <p className="text-gray-500 text-sm">Ringkasan progress dari 3 Ketua Tim Kerja</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Tim" value={stats.totalTim} accent="blue" />
          <StatCard label="Total Pekerjaan" value={stats.totalPekerjaan} accent="blue" />
          <StatCard label="Rata-rata Progress" value={`${stats.avgProgress}%`} accent="yellow" />
        </div>

        <div className="space-y-4">
          {teams.map((team) => {
            const isCollapsed = collapsed[team.id]
            return (
              <div
                key={team.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Header tim - bisa diklik untuk collapse/expand */}
                <button
                  onClick={() => toggle(team.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <div>
                      <h2 className="font-semibold text-pupr-blue-dark">{team.nama_tim}</h2>
                      <p className="text-xs text-gray-500">Ketua Tim: {team.ketua_tim}</p>
                    </div>
                  </div>
                  <div className="w-36 shrink-0">
                    <MiniProgress value={team.progress_keseluruhan} />
                  </div>
                </button>

                {/* Tabel uraian tugas & pekerjaan */}
                {!isCollapsed && (
                  <div className="border-t border-gray-100">
                    {/* Header kolom */}
                    <div className="grid grid-cols-[1fr_110px_140px] gap-4 px-5 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/60">
                      <span>Pekerjaan</span>
                      <span>Status</span>
                      <span>Progress</span>
                    </div>

                    {team.uraian_tugas.map((tp) => (
                      <div key={tp.id}>
                        {/* Group header: uraian tugas resmi */}
                        <div className="flex items-center gap-2 px-5 py-2 bg-pupr-blue/[0.03] border-t border-gray-100">
                          <span className="w-4 h-4 rounded-full bg-pupr-blue text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                            {tp.nomor_urut}
                          </span>
                          <span className="text-xs font-medium text-pupr-blue-dark">{tp.uraian}</span>
                          <span className="text-[11px] text-gray-400 ml-auto shrink-0">
                            {tp.jumlah_pekerjaan} pekerjaan
                          </span>
                        </div>

                        {tp.pekerjaan.length === 0 && (
                          <div className="px-5 py-3 text-xs text-gray-400 italic border-t border-gray-50">
                            Belum ada pekerjaan ditambahkan
                          </div>
                        )}

                        {tp.pekerjaan.map((p) => (
                          <div
                            key={p.id}
                            className="grid grid-cols-[1fr_110px_140px] gap-4 px-5 py-3 border-t border-gray-50 hover:bg-gray-50/70 transition items-center"
                          >
                            <span className="text-sm text-gray-700">{p.judul}</span>
                            <StatusDot status={p.status} />
                            <MiniProgress value={p.progress} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
