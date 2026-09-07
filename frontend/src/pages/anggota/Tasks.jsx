import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { Link } from 'react-router-dom'
import ProgressBar from '../../components/ProgressBar'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import { formatDate, statusBadgeClass } from '../../lib/helpers'

const STATUSES = ['Belum Dimulai', 'Sedang Berjalan', 'Menunggu Approval', 'Selesai', 'Terlambat']

export default function Tasks() {
  const [tasks, setTasks] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    api.get('/subtasks', { params: { status: statusFilter } }).then((res) => setTasks(res.data))
  }, [statusFilter])

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Tugas Saya</h1>
      <p className="text-sm text-gray-500 mb-4">Daftar subtask yang ditugaskan kepada Anda.</p>

      <select className="input sm:w-56 mb-4" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">Semua Status</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {!tasks ? <Loading /> : !tasks.length ? <EmptyState text="Belum ada tugas." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {tasks.map((t) => (
            <Link key={t.id} to={`/anggota/tasks/${t.id}`} className="card p-5 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900">{t.judul}</h3>
              <p className="text-sm text-gray-500 mt-1">{t.project?.judul}</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span><span>{t.progress}%</span>
                </div>
                <ProgressBar value={t.progress} />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={statusBadgeClass(t.status)}>{t.status}</span>
                <span className="text-xs text-gray-400">Deadline: {formatDate(t.deadline)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
