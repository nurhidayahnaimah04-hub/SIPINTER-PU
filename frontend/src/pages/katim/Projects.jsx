import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { Link } from 'react-router-dom'
import ProgressBar from '../../components/ProgressBar'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import { formatDate, statusBadgeClass, priorityClass, priorityLabel } from '../../lib/helpers'

export default function Projects() {
  const [projects, setProjects] = useState(null)

  useEffect(() => { api.get('/projects').then((res) => setProjects(res.data.data)) }, [])

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Tugas dari Pimpinan</h1>
      <p className="text-sm text-gray-500 mb-6">Tugas besar yang ditugaskan ke tim Anda. Pecah menjadi subtask untuk anggota.</p>

      {!projects ? <Loading /> : !projects.length ? <EmptyState text="Belum ada tugas untuk tim Anda." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <Link key={p.id} to={`/katim/projects/${p.id}`} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{p.judul}</h3>
                <span className={`badge ${priorityClass(p.priority)}`}>{priorityLabel(p.priority)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{p.subtasks_count} subtask</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span><span>{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={statusBadgeClass(p.status)}>{p.status}</span>
                <span className="text-xs text-gray-400">Deadline: {formatDate(p.deadline)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
