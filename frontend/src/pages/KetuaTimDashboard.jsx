import { useEffect, useState } from 'react'
import api from '../api/axios.js'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from '../components/Navbar.jsx'
import StatusDot from '../components/StatusDot.jsx'
import MiniProgress from '../components/MiniProgress.jsx'
import Avatar from '../components/Avatar.jsx'

export default function KetuaTimDashboard() {
  const { user } = useAuth()
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newTaskFor, setNewTaskFor] = useState(null)
  const [taskForm, setTaskForm] = useState({ judul: '', deskripsi: '', tanggal_target: '' })
  const [subTaskFormFor, setSubTaskFormFor] = useState(null)
  const [subTaskForm, setSubTaskForm] = useState({ judul: '', assigned_to: '', tanggal_target: '' })
  const [expandedTask, setExpandedTask] = useState({})

  const teamId = user?.team_id

  function loadTeam() {
    if (!teamId) return
    api.get(`/dashboard/tim/${teamId}`).then((res) => setTeam(res.data))
  }

  useEffect(() => {
    loadTeam()
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  async function handleCreateTask(e, tugasPokokId) {
    e.preventDefault()
    await api.post('/main-tasks', { ...taskForm, tugas_pokok_id: tugasPokokId })
    setTaskForm({ judul: '', deskripsi: '', tanggal_target: '' })
    setNewTaskFor(null)
    loadTeam()
  }

  async function handleCreateSubTask(e, mainTaskId) {
    e.preventDefault()
    await api.post(`/main-tasks/${mainTaskId}/sub-tasks`, subTaskForm)
    setSubTaskForm({ judul: '', assigned_to: '', tanggal_target: '' })
    setSubTaskFormFor(null)
    loadTeam()
  }

  function toggleExpand(taskId) {
    setExpandedTask((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  if (loading || !team) {
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
          <h1 className="text-2xl font-bold text-pupr-blue-dark mb-1">{team.nama_tim}</h1>
          <p className="text-gray-500 text-sm">
            Kelola pekerjaan tim dan sub tugas untuk anggota Anda
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header kolom */}
          <div className="grid grid-cols-[1fr_110px_140px_36px] gap-4 px-5 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/60">
            <span>Pekerjaan</span>
            <span>Status</span>
            <span>Progress</span>
            <span />
          </div>

          {team.tugas_pokok.map((tp) => (
            <div key={tp.id}>
              {/* Group header: uraian tugas resmi */}
              <div className="flex items-center gap-2 px-5 py-2 bg-pupr-blue/[0.03] border-t border-gray-100">
                <span className="w-4 h-4 rounded-full bg-pupr-blue text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  {tp.nomor_urut}
                </span>
                <span className="text-xs font-medium text-pupr-blue-dark">{tp.uraian}</span>
              </div>

              {tp.main_tasks.map((mt) => (
                <div key={mt.id} className="border-t border-gray-50">
                  {/* Baris pekerjaan utama */}
                  <button
                    onClick={() => toggleExpand(mt.id)}
                    className="w-full grid grid-cols-[1fr_110px_140px_36px] gap-4 px-5 py-3 hover:bg-gray-50/70 transition items-center text-left"
                  >
                    <span className="text-sm text-gray-700 flex items-center gap-2">
                      <svg
                        className={`w-3.5 h-3.5 text-gray-300 transition-transform shrink-0 ${expandedTask[mt.id] ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {mt.judul}
                    </span>
                    <StatusDot status={mt.status} />
                    <MiniProgress value={mt.progress} />
                    <span className="text-[11px] text-gray-400 text-right">
                      {mt.sub_tasks?.length || 0}
                    </span>
                  </button>

                  {/* Detail sub tugas, muncul saat expand */}
                  {expandedTask[mt.id] && (
                    <div className="bg-gray-50/50 pl-9 pr-5 pb-3">
                      {mt.sub_tasks?.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
                        >
                          <Avatar name={st.penerima_tugas?.name} />
                          <span className="text-xs text-gray-600 flex-1">{st.judul}</span>
                          <StatusDot status={st.status} />
                          <div className="w-28">
                            <MiniProgress value={st.progress} />
                          </div>
                        </div>
                      ))}

                      {subTaskFormFor === mt.id ? (
                        <form
                          onSubmit={(e) => handleCreateSubTask(e, mt.id)}
                          className="mt-2 flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <input
                            required
                            placeholder="Judul sub tugas"
                            value={subTaskForm.judul}
                            onChange={(e) => setSubTaskForm({ ...subTaskForm, judul: e.target.value })}
                            className="flex-1 min-w-[160px] border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pupr-blue-light"
                          />
                          <select
                            required
                            value={subTaskForm.assigned_to}
                            onChange={(e) => setSubTaskForm({ ...subTaskForm, assigned_to: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pupr-blue-light"
                          >
                            <option value="">Anggota...</option>
                            {team.anggota.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={subTaskForm.tanggal_target}
                            onChange={(e) => setSubTaskForm({ ...subTaskForm, tanggal_target: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pupr-blue-light"
                          />
                          <button
                            type="submit"
                            className="bg-pupr-yellow hover:bg-pupr-yellow-dark text-pupr-blue-dark text-xs font-semibold px-3 py-1.5 rounded transition"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubTaskFormFor(null)}
                            className="text-xs px-2 text-gray-500 hover:text-gray-700"
                          >
                            Batal
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setSubTaskFormFor(mt.id)}
                          className="mt-2 text-xs text-pupr-blue font-medium hover:underline flex items-center gap-1"
                        >
                          + Tambah sub tugas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Baris tambah pekerjaan - gaya "new row" */}
              {newTaskFor === tp.id ? (
                <form
                  onSubmit={(e) => handleCreateTask(e, tp.id)}
                  className="flex flex-wrap gap-2 items-center px-5 py-3 bg-gray-50/50 border-t border-dashed border-gray-200"
                >
                  <input
                    required
                    autoFocus
                    placeholder="Judul pekerjaan baru..."
                    value={taskForm.judul}
                    onChange={(e) => setTaskForm({ ...taskForm, judul: e.target.value })}
                    className="flex-1 min-w-[160px] border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pupr-blue-light"
                  />
                  <input
                    type="date"
                    value={taskForm.tanggal_target}
                    onChange={(e) => setTaskForm({ ...taskForm, tanggal_target: e.target.value })}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pupr-blue-light"
                  />
                  <button
                    type="submit"
                    className="bg-pupr-yellow hover:bg-pupr-yellow-dark text-pupr-blue-dark text-xs font-semibold px-3 py-1.5 rounded transition"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTaskFor(null)}
                    className="text-xs px-2 text-gray-500 hover:text-gray-700"
                  >
                    Batal
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setNewTaskFor(tp.id)}
                  className="w-full text-left px-5 py-2.5 text-xs text-gray-400 hover:text-pupr-blue hover:bg-gray-50/70 transition border-t border-dashed border-gray-100"
                >
                  + Tambah pekerjaan baru
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
