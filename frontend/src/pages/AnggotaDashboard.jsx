import { useEffect, useState } from 'react'
import api from '../api/axios.js'
import Navbar from '../components/Navbar.jsx'
import StatusDot from '../components/StatusDot.jsx'
import MiniProgress from '../components/MiniProgress.jsx'

export default function AnggotaDashboard() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ progress: 0, catatan_update: '' })

  function loadTasks() {
    api.get('/my-tasks').then((res) => setTasks(res.data))
  }

  useEffect(() => {
    loadTasks()
    setLoading(false)
  }, [])

  function startEdit(task) {
    setEditing(editing === task.id ? null : task.id)
    setForm({ progress: task.progress, catatan_update: task.catatan_update || '' })
  }

  async function handleUpdate(e, taskId) {
    e.preventDefault()
    await api.patch(`/sub-tasks/${taskId}/progress`, form)
    setEditing(null)
    loadTasks()
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
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-pupr-blue-dark mb-1">Sub Tugas Saya</h1>
          <p className="text-gray-500 text-sm">
            Update progress pekerjaan yang ditugaskan Ketua Tim Anda
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_140px] gap-4 px-5 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/60">
            <span>Tugas</span>
            <span>Status</span>
            <span>Progress</span>
          </div>

          {tasks.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Belum ada sub tugas yang ditugaskan.
            </div>
          )}

          {tasks.map((task) => (
            <div key={task.id} className="border-t border-gray-50">
              <button
                onClick={() => startEdit(task)}
                className="w-full grid grid-cols-[1fr_100px_140px] gap-4 px-5 py-3 hover:bg-gray-50/70 transition items-center text-left"
              >
                <div>
                  <p className="text-sm text-gray-700">{task.judul}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {task.main_task?.judul} · {task.main_task?.tugas_pokok?.uraian}
                  </p>
                </div>
                <StatusDot status={task.status} />
                <MiniProgress value={task.progress} />
              </button>

              {editing === task.id && (
                <form
                  onSubmit={(e) => handleUpdate(e, task.id)}
                  className="px-5 pb-4 bg-gray-50/50"
                >
                  {task.deskripsi && (
                    <p className="text-xs text-gray-500 mb-3 pt-1">{task.deskripsi}</p>
                  )}
                  <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
                    <div>
                      <label className="flex justify-between text-xs font-medium text-gray-600 mb-1.5">
                        <span>Geser untuk update progress</span>
                        <span className="text-pupr-blue font-semibold">{form.progress}%</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={form.progress}
                        onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                        className="w-full accent-pupr-blue"
                      />
                    </div>
                    <textarea
                      placeholder="Catatan update (opsional)"
                      value={form.catatan_update}
                      onChange={(e) => setForm({ ...form, catatan_update: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pupr-blue-light"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-pupr-yellow hover:bg-pupr-yellow-dark text-pupr-blue-dark text-xs font-semibold px-4 py-1.5 rounded transition"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
