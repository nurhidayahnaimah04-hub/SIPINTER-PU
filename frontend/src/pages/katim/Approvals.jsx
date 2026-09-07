import { useEffect, useState } from 'react'
import api from '../../lib/api'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import { formatDate } from '../../lib/helpers'
import { CheckCircle2, XCircle, Paperclip } from 'lucide-react'

export default function Approvals() {
  const [projects, setProjects] = useState(null)
  const [notes, setNotes] = useState({})

  async function load() {
    const res = await api.get('/projects')
    const detailed = await Promise.all(res.data.data.map((p) => api.get(`/projects/${p.id}`).then((r) => r.data)))
    setProjects(detailed)
  }

  useEffect(() => { load() }, [])

  const pending = (projects || []).flatMap((p) =>
    (p.subtasks || []).filter((s) => s.status === 'Menunggu Approval').map((s) => ({ ...s, project: p }))
  )

  async function handleApprove(subtaskId, keputusan) {
    const catatan = notes[subtaskId] || ''
    if (keputusan === 'ditolak' && !catatan.trim()) {
      alert('Wajib isi catatan alasan penolakan.')
      return
    }
    await api.post(`/subtasks/${subtaskId}/approve`, { keputusan, catatan })
    load()
  }

  if (!projects) return <Loading />

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Approval Center</h1>
      <p className="text-sm text-gray-500 mb-6">Update progres anggota yang menunggu persetujuan Anda.</p>

      {!pending.length ? <EmptyState text="Tidak ada update yang menunggu approval." /> : (
        <div className="space-y-4">
          {pending.map((s) => {
            const lastUpdate = s.updates?.[0]
            return (
              <div key={s.id} className="card p-5">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{s.judul}</p>
                    <p className="text-sm text-gray-500">{s.assignee?.name} · Proyek: {s.project.judul}</p>
                  </div>
                  <span className="badge badge-approval">Menunggu Approval</span>
                </div>
                {lastUpdate && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="text-gray-700">{lastUpdate.catatan || 'Tidak ada catatan.'}</p>
                    <p className="text-xs text-gray-400 mt-1">Dikirim {formatDate(lastUpdate.created_at)}</p>
                    {lastUpdate.files?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {lastUpdate.files.map((f) => (
                          <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                            <Paperclip size={12} /> Bukti {f.id}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <textarea
                  className="input mt-3"
                  rows={2}
                  placeholder="Catatan (wajib jika ditolak)"
                  value={notes[s.id] || ''}
                  onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
                />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleApprove(s.id, 'disetujui')} className="btn btn-success"><CheckCircle2 size={16} /> Setujui</button>
                  <button onClick={() => handleApprove(s.id, 'ditolak')} className="btn btn-danger"><XCircle size={16} /> Tolak</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
