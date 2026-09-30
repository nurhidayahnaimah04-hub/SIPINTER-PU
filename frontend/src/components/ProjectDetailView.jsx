import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import ProgressBar from './ProgressBar'
import Modal from './Modal'
import Loading from './Loading'
import EmptyState from './EmptyState'
import { formatDate, statusBadgeClass, priorityClass, priorityLabel } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Plus, MessageSquare, Paperclip, CheckCircle2, XCircle, Send } from 'lucide-react'

export default function ProjectDetailView({ basePath, canAddSubtask: propsCanAddSubtask, canApproveProject }) {
  const { id } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [subtaskOpen, setSubtaskOpen] = useState(false)
  
  // State form bersih tanpa bobot
  const [form, setForm] = useState({ judul: '', deskripsi: '', assigned_to: [], deadline: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState([])
  const [approveNote, setApproveNote] = useState('')

  function load() {
    api.get(`/projects/${id}`).then((res) => setProject(res.data))
    api.get('/comments', { params: { project_id: id } }).then((res) => setComments(res.data))
  }

  useEffect(() => { load() }, [id])

  // PERBAIKAN 1: Pengambilan Daftar Anggota secara Dinamis
  const availableUsers = useMemo(() => {
    if (!project) return [];

    // Jika Tugas Umum (tanpa tim), ambil seluruh pengguna sistem
    if (!project.team_id || !project.team) {
      return project.all_users || [];
    }

    // Jika Katim/Anggota dikirimkan my_team_members
    if (project.my_team_members?.length) {
      return project.my_team_members;
    }

    // Ambil dari daftar anggota tim
    let usersList = [...(project.team.members || [])];
    if (project.team.katim && !usersList.some((m) => m.id === project.team.katim.id)) {
      usersList.unshift({
        id: project.team.katim.id,
        name: `${project.team.katim.name} (Katim)`,
      });
    }

    return usersList;
  }, [project]);

  // PERBAIKAN 2: Otorisasi Mandiri (Anggota, Katim, Kasubag, Kabalai)
  const canAddSubtask = propsCanAddSubtask || ['kasubag', 'katim', 'anggota', 'kabalai'].includes(user?.role);

  async function handleAddSubtask(e) {
    e.preventDefault()
    
    const assignedArray = Array.isArray(form.assigned_to) ? form.assigned_to : [];
    if (assignedArray.length === 0) {
      setFormError('Pilih minimal 1 anggota tim pelaksana.')
      return
    }

    if (!form.deadline) {
      setFormError('Tanggal deadline wajib diisi.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      await api.post(`/projects/${id}/subtasks`, {
        judul: form.judul,
        deskripsi: form.deskripsi,
        deadline: form.deadline,
        assigned_to: assignedArray
      })
      setSubtaskOpen(false)
      setForm({ judul: '', deskripsi: '', assigned_to: [], deadline: '' })
      load()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menambahkan subtask.')
    } finally {
      setSaving(false)
    }
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    const res = await api.post('/comments', { project_id: id, komentar: comment })
    setComments([...comments, res.data])
    setComment('')
  }

  async function handleApproveProject(keputusan) {
    await api.post(`/projects/${id}/approve`, { keputusan, catatan: approveNote })
    setApproveNote('')
    load()
  }

  if (!project) return <Loading />

  return (
    <div>
      <Link to={basePath} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Kembali
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{project.judul}</h1>
            <p className="text-sm text-gray-500 mt-1">Tim: {project.team?.nama_tim || 'Tugas Umum'} {project.team?.katim?.name ? `· Katim: ${project.team.katim.name}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${priorityClass(project.priority)}`}>{priorityLabel(project.priority)}</span>
            <span className={statusBadgeClass(project.status)}>{project.status}</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4">{project.deskripsi || 'Tidak ada deskripsi.'}</p>
        <div className="mt-5">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress Keseluruhan</span><span className="font-medium">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} />
        </div>
        <p className="text-xs text-gray-400 mt-3">Deadline: {formatDate(project.deadline)} · Dibuat oleh {project.creator?.name}</p>

        {canApproveProject && project.status === 'Review' && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-800 mb-2">Approval Tugas Besar</p>
            <textarea className="input mb-2" rows={2} placeholder="Catatan (opsional)" value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => handleApproveProject('disetujui')} className="btn btn-success"><CheckCircle2 size={16} /> Setujui</button>
              <button onClick={() => handleApproveProject('ditolak')} className="btn btn-danger"><XCircle size={16} /> Tolak</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Subtask ({project.subtasks?.length || 0})</h2>
        {canAddSubtask && (
          <button onClick={() => { setFormError(''); setSubtaskOpen(true); }} className="btn btn-secondary text-sm">
            <Plus size={15} /> Tambah Subtask
          </button>
        )}
      </div>

      {!project.subtasks?.length ? <EmptyState text="Belum ada subtask." /> : (
        <div className="space-y-3 mb-6">
          {project.subtasks.map((s) => {
            const displayAssignees = s.assignees && s.assignees.length > 0
              ? s.assignees.map(a => a.name).join(', ')
              : (s.assignee?.name || 'Belum ada pelaksana');

            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-medium text-gray-900">{s.judul}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-gray-700">{displayAssignees}</span>{s.deadline ? ` · Deadline ${formatDate(s.deadline)}` : ''}
                    </p>
                  </div>
                  <span className={statusBadgeClass(s.status)}>{s.status}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={s.progress} />
                </div>
                {s.updates?.[0]?.files?.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                    <Paperclip size={12} /> {s.updates[0].files.length} bukti terlampir
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MessageSquare size={17} /> Diskusi</h2>
        <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
          {!comments.length ? <p className="text-sm text-gray-400">Belum ada komentar.</p> : comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium text-gray-800">{c.user?.name}</span>{' '}
              <span className="text-xs text-gray-400">({c.user?.role})</span>
              <p className="text-gray-600">{c.komentar}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleComment} className="flex gap-2">
          <input className="input flex-1" placeholder="Tulis komentar..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60"><Send size={16} /></button>
        </form>
      </div>

      <Modal open={subtaskOpen} onClose={() => { setSubtaskOpen(false); setForm({ judul: '', deskripsi: '', assigned_to: [], deadline: '' }); }} title="Tambah Subtask">
        <form onSubmit={handleAddSubtask} className="space-y-4">
          {formError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{formError}</div>}
          
          <div>
            <label className="label">Judul Subtask</label>
            <input required className="input" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea className="input" rows={2} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
          </div>

          {/* Checklist Multi-Select Anggota Tim */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="label mb-0">Anggota Tim (Bisa pilih lebih dari 1)</label>
              {availableUsers.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-brand-600 font-semibold hover:underline"
                  onClick={() => {
                    const currentArray = Array.isArray(form.assigned_to) ? form.assigned_to : [];
                    if (currentArray.length === availableUsers.length) {
                      setForm({ ...form, assigned_to: [] });
                    } else {
                      setForm({ ...form, assigned_to: availableUsers.map((u) => u.id) });
                    }
                  }}
                >
                  {Array.isArray(form.assigned_to) && form.assigned_to.length === availableUsers.length ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-300 bg-white p-2.5 shadow-sm space-y-1">
              {availableUsers && availableUsers.length > 0 ? (
                availableUsers.map((u) => {
                  const isChecked = Array.isArray(form.assigned_to) && form.assigned_to.includes(u.id);

                  return (
                    <label
                      key={u.id}
                      className={`flex items-center gap-3 p-2 rounded-md transition cursor-pointer select-none ${
                        isChecked ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={isChecked}
                        onChange={(e) => {
                          const currentList = Array.isArray(form.assigned_to) ? form.assigned_to : [];
                          if (e.target.checked) {
                            setForm({ ...form, assigned_to: [...currentList, u.id] });
                          } else {
                            setForm({ ...form, assigned_to: currentList.filter((id) => id !== u.id) });
                          }
                        }}
                      />
                      <span className="text-sm">{u.name}</span>
                    </label>
                  );
                })
              ) : (
                <p className="text-xs text-gray-500 italic p-2">Tidak ada anggota tim tersedia.</p>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Terpilih: <span className="font-bold text-blue-600">{Array.isArray(form.assigned_to) ? form.assigned_to.length : 0}</span> orang
            </p>
          </div>

          <div>
            <label className="label">Deadline</label>
            <input type="date" required className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>

          <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={saving}>{saving ? 'Menyimpan...' : 'Tambah Subtask'}</button>
        </form>
      </Modal>
    </div>
  )
}