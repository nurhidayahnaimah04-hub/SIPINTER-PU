import { useEffect, useState } from 'react'
import api from '../lib/api'
import Modal from './Modal'
import Loading from './Loading'
import EmptyState from './EmptyState'
import { Plus, Users, Pencil, Trash2, AlertTriangle } from 'lucide-react'

export default function TeamsView() {
  const [teams, setTeams] = useState(null)
  const [katimList, setKatimList] = useState([])
  const [anggotaList, setAnggotaList] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nama_tim: '', kode_tim: '', katim_id: '', anggota_ids: [] })
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  function load() { api.get('/teams').then((res) => setTeams(res.data)) }

  useEffect(() => {
    load()
    api.get('/users', { params: { role: 'katim' } }).then((res) => setKatimList(res.data.data))
    api.get('/users', { params: { role: 'anggota' } }).then((res) => setAnggotaList(res.data.data))
  }, [])

  function openCreate() {
    setEditing(null)
    setForm({ nama_tim: '', kode_tim: '', katim_id: '', anggota_ids: [] })
    setOpen(true)
  }

  function openEdit(t) {
    setEditing(t)
    setForm({ nama_tim: t.nama_tim, kode_tim: t.kode_tim || '', katim_id: t.katim_id, anggota_ids: t.members?.map((m) => m.id) || [] })
    setOpen(true)
  }

  function toggleMember(id) {
    setForm((f) => ({ ...f, anggota_ids: f.anggota_ids.includes(id) ? f.anggota_ids.filter((x) => x !== id) : [...f.anggota_ids, id] }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) await api.put(`/teams/${editing.id}`, form)
      else await api.post('/teams', form)
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  function openDelete(t) {
    setDeleteError('')
    setDeleteTarget(t)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/teams/${deleteTarget.id}`)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus tim.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Manajemen Tim</h1>
          <p className="text-sm text-gray-500">Kelola tim, kepala tim, dan anggotanya.</p>
        </div>
        <button onClick={openCreate} className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60"><Plus size={16} /> Buat Tim</button>
      </div>

      {!teams ? <Loading /> : !teams.length ? <EmptyState text="Belum ada tim." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {teams.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.nama_tim} {t.kode_tim && <span className="text-xs text-gray-400 font-normal">({t.kode_tim})</span>}</h3>
                  <p className="text-sm text-gray-500">Katim: {t.katim?.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(t)} title="Edit tim" className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50"><Pencil size={16} /></button>
                  <button onClick={() => openDelete(t)} title="Hapus tim" className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-gray-400"><Users size={13} /> {t.members?.length || 0} anggota</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.members?.map((m) => <span key={m.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{m.name}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">{editing ? 'Edit Tim' : 'Buat Tim Baru'}</span>} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Nama Tim</label>
              <input required className="input" value={form.nama_tim} onChange={(e) => setForm({ ...form, nama_tim: e.target.value })} />
            </div>
            <div>
              <label className="label">Kode</label>
              <input className="input" placeholder="mis. KPA" value={form.kode_tim} onChange={(e) => setForm({ ...form, kode_tim: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Kepala Tim (Katim)</label>
            <select required className="input" value={form.katim_id} onChange={(e) => setForm({ ...form, katim_id: e.target.value })}>
              <option value="">Pilih katim...</option>
              {katimList.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Anggota Tim</label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
              {anggotaList.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={form.anggota_ids.includes(a.id)} onChange={() => toggleMember(a.id)} />
                  {a.name}
                </label>
              ))}
            </div>
          </div>
          <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Tim'}</button>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Hapus Tim</span>}
      >
        <div className="space-y-4">
          {deleteError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{deleteError}</div>}
          <div className="flex items-start gap-3 bg-red-50 text-red-700 rounded-lg px-4 py-3">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Yakin ingin menghapus tim <span className="font-semibold">"{deleteTarget?.nama_tim}"</span>?
              Semua tugas & subtugas milik tim ini (beserta progres, komentar, dan file buktinya) ikut terhapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Batal
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Menghapus...' : 'Ya, Hapus Tim'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}