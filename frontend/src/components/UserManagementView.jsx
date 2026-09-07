import { useEffect, useState } from 'react'
import api from '../lib/api'
import Modal from './Modal'
import Loading from './Loading'
import EmptyState from './EmptyState'
import { roleLabel } from '../lib/helpers'
import { Plus, Pencil, UserX, UserCheck, Trash2, Search, AlertTriangle } from 'lucide-react'

export default function UserManagementView() {
  const [users, setUsers] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', nip: '', email: '', jabatan: '', role: 'anggota', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState('')

  const [activatingId, setActivatingId] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  function load() { api.get('/users', { params: { search, role: roleFilter } }).then((res) => setUsers(res.data.data)) }

  useEffect(() => { load() }, [search, roleFilter])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', nip: '', email: '', jabatan: '', role: 'anggota', password: '' })
    setOpen(true)
  }

  function openEdit(u) {
    setEditing(u)
    setForm({ name: u.name, nip: u.nip || '', email: u.email, jabatan: u.jabatan || '', role: u.role, password: '' })
    setOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      if (editing && !payload.password) delete payload.password
      if (editing) await api.put(`/users/${editing.id}`, payload)
      else await api.post('/users', payload)
      setOpen(false)
      load()
    } catch (err) {
      setError('Gagal menyimpan. Periksa email/NIP unik & kelengkapan data.')
    } finally {
      setSaving(false)
    }
  }

  // Aktifkan kembali -- aksi ringan & bisa dibalik (tinggal nonaktifkan lagi kalau salah),
  // jadi tanpa modal konfirmasi, langsung jalan.
  async function handleActivate(u) {
    setActivatingId(u.id)
    try {
      await api.put(`/users/${u.id}`, { is_active: true })
      load()
    } finally {
      setActivatingId(null)
    }
  }

  function openDeactivate(u) {
    setDeactivateError('')
    setDeactivateTarget(u)
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setDeactivating(true)
    setDeactivateError('')
    try {
      await api.delete(`/users/${deactivateTarget.id}`)
      setDeactivateTarget(null)
      load()
    } catch (err) {
      setDeactivateError(err.response?.data?.message || 'Gagal menonaktifkan user.')
    } finally {
      setDeactivating(false)
    }
  }

  function openDelete(u) {
    setDeleteError('')
    setDeleteTarget(u)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/users/${deleteTarget.id}/permanent`)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus user.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Manajemen User</h1>
          <p className="text-sm text-gray-500">Tambah, ubah, aktifkan/nonaktifkan, atau hapus akun pegawai.</p>
        </div>
        <button onClick={openCreate} className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60"><Plus size={16} /> Tambah User</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="     Cari nama, NIP, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Semua Role</option>
          <option value="kabalai">Kabalai</option>
          <option value="kasubag">Kasubag</option>
          <option value="katim">Kepala Tim</option>
          <option value="anggota">Anggota</option>
        </select>
      </div>

      {!users ? <Loading /> : !users.length ? <EmptyState text="Belum ada user." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">NIP</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.jabatan}</p></td>
                  <td className="px-4 py-3 text-gray-600">{u.nip || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="badge badge-berjalan">{roleLabel(u.role)}</span></td>
                  <td className="px-4 py-3"><span className={`badge ${u.is_active ? 'badge-selesai' : 'badge-terlambat'}`}>{u.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)} title="Edit user" className="text-gray-400 hover:text-gray-700"><Pencil size={16} /></button>
                      {u.is_active ? (
                        <button onClick={() => openDeactivate(u)} title="Nonaktifkan" className="text-gray-400 hover:text-orange-600"><UserX size={16} /></button>
                      ) : (
                        <button onClick={() => handleActivate(u)} disabled={activatingId === u.id} title="Aktifkan kembali" className="text-gray-400 hover:text-green-600 disabled:opacity-60"><UserCheck size={16} /></button>
                      )}
                      <button onClick={() => openDelete(u)} title="Hapus permanen" className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">{editing ? 'Edit User' : 'Tambah User'}</span>}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="label">Nama Lengkap</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">NIP</label>
              <input className="input" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="kabalai">Kabalai</option>
                <option value="kasubag">Kasubag</option>
                <option value="katim">Kepala Tim</option>
                <option value="anggota">Anggota</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Jabatan</label>
            <input className="input" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} />
          </div>
          <div>
            <label className="label">Password {editing && '(kosongkan jika tidak diubah)'}</label>
            <input type="password" className="input" required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah User'}</button>
        </form>
      </Modal>

      <Modal
        open={!!deactivateTarget}
        onClose={() => !deactivating && setDeactivateTarget(null)}
        title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Nonaktifkan User</span>}
      >
        <div className="space-y-4">
          {deactivateError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{deactivateError}</div>}
          <div className="flex items-start gap-3 bg-red-50 text-red-700 rounded-lg px-4 py-3">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Nonaktifkan akun <span className="font-semibold">{deactivateTarget?.name}</span>?
              Akun ini tidak akan bisa login lagi, tapi datanya tetap tersimpan dan bisa diaktifkan kembali kapan pun.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDeactivateTarget(null)} disabled={deactivating}>
              Batal
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDeactivate} disabled={deactivating}>
              {deactivating ? 'Memproses...' : 'Ya, Nonaktifkan'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Hapus User Permanen</span>}
      >
        <div className="space-y-4">
          {deleteError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{deleteError}</div>}
          <div className="flex items-start gap-3 bg-red-50 text-red-700 rounded-lg px-4 py-3">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Hapus permanen akun <span className="font-semibold">{deleteTarget?.name}</span>? Riwayat komentar dan update
              milik user ini ikut terhapus. Tindakan ini <b>tidak bisa dibatalkan</b> — kalau ragu, gunakan "Nonaktifkan" saja.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Batal
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}