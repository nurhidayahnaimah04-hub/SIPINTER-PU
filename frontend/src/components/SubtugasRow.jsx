import { useEffect, useState } from 'react'
import ProgressBar from './ProgressBar'
import Modal from './Modal'
import { formatDate, statusBadgeClass } from '../lib/helpers'
import { Paperclip, CheckCircle2, XCircle, Lock, MessageSquare, Send, Pencil, Trash2, AlertTriangle, UploadCloud, X } from 'lucide-react'
import api from '../lib/api'

export default function SubtugasRow({ subtugas, role, onChanged, users = [] }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ judul: '', deskripsi: '', assigned_to: '', deadline: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editFiles, setEditFiles] = useState([]) 

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const canVerifikasiKatim = role === 'katim' && subtugas.status === 'Menunggu Verifikasi Katim'
  const canVerifikasiKasubag = role === 'kasubag' && subtugas.status === 'Menunggu Verifikasi Kasubag'
  const canManageSubtugas = role === 'katim' || role === 'kasubag'

  // Gabungkan file dari skema baru dan lama untuk ditampilkan di Detail & Modal Edit
  const oldSystemFiles = subtugas.updates
    ?.filter(u => u.catatan === 'Lampiran subtugas' || u.catatan === 'Lampiran awal subtugas' || u.catatan?.startsWith('Penambahan lampiran'))
    ?.flatMap(u => u.files || []) || [];
  
  const lampiranAtasan = [...(subtugas.files || []), ...oldSystemFiles];

  // Sembunyikan update sistem lama dari riwayat progres
  const visibleUpdates = subtugas.updates?.filter(u => {
    return !(u.catatan === 'Lampiran subtugas' || u.catatan === 'Lampiran awal subtugas' || u.catatan?.startsWith('Penambahan lampiran'));
  }) || [];

  useEffect(() => {
    api.get('/comments', { params: { subtugas_id: subtugas.id } }).then((res) => setComments(res.data))
  }, [subtugas.id])

  async function handleAddComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      const res = await api.post('/comments', { subtugas_id: subtugas.id, komentar: commentText })
      setComments([...comments, res.data])
      setCommentText('')
    } finally {
      setSendingComment(false)
    }
  }

  async function verifikasi(tahap, keputusan) {
    if (keputusan === 'ditolak' && !note.trim()) {
      alert('Wajib isi catatan alasan penolakan.')
      return
    }
    setBusy(true)
    try {
      await api.post(`/subtugas/${subtugas.id}/verifikasi-${tahap}`, { keputusan, catatan: note })
      setNote('')
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  function openEdit() {
    setEditForm({
      judul: subtugas.judul,
      deskripsi: subtugas.deskripsi || '',
      assigned_to: subtugas.assigned_to || subtugas.assignee?.id || '',
      deadline: (subtugas.deadline || '').slice(0, 10),
    })
    setEditFiles([]) 
    setEditError('')
    setEditOpen(true)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditSaving(true)
    setEditError('')
    try {
      const formData = new FormData()
      formData.append('judul', editForm.judul)
      formData.append('deskripsi', editForm.deskripsi)
      formData.append('assigned_to', editForm.assigned_to)
      if (editForm.deadline) formData.append('deadline', editForm.deadline)

      editFiles.forEach((f) => formData.append('files', f))

      await api.put(`/subtugas/${subtugas.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setEditOpen(false)
      setEditFiles([])
      onChanged?.()
    } catch (err) {
      setEditError(err.response?.data?.message || 'Gagal menyimpan perubahan.')
    } finally {
      setEditSaving(false)
    }
  }

  function openDelete() {
    setDeleteError('')
    setDeleteOpen(true)
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/subtugas/${subtugas.id}`)
      setDeleteOpen(false)
      onChanged?.()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus subtugas.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteFile(fileId) {
    try {
      await api.delete(`/subtugas/files/${fileId}`)
      onChanged?.() 
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus lampiran.')
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 pr-4">
          <p className="font-medium text-gray-900 flex items-center gap-1.5">
            {subtugas.judul}
            {subtugas.locked && <Lock size={13} className="text-gray-400" />}
          </p>
          <p className="text-xs text-gray-500 mt-1 mb-2">
            {subtugas.assignee?.name}{subtugas.deadline ? ` · Deadline ${formatDate(subtugas.deadline)}` : ''}
          </p>

          {/* Menampilkan Deskripsi Subtugas */}
          {subtugas.deskripsi && (
            <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{subtugas.deskripsi}</p>
          )}

          {/* Menampilkan Lampiran Katim/Kasubag di luar */}
          {lampiranAtasan.length > 0 && (
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 mb-3 w-full">
              <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                <Paperclip size={13} /> Lampiran Subtugas
              </p>
              <div className="flex flex-wrap gap-2">
                {lampiranAtasan.map((f) => (
                  <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-600 hover:underline bg-white px-2 py-1.5 rounded border border-gray-200 hover:border-brand-300 transition-colors">
                    <Paperclip size={12} className="text-brand-500" /> {f.file_name || `Lampiran ${f.id}`}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {canManageSubtugas && (
            <>
              <button onClick={openEdit} title="Edit subtugas" className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50">
                <Pencil size={14} />
              </button>
              <button onClick={openDelete} title="Hapus subtugas" className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </>
          )}
          <span className={statusBadgeClass(subtugas.status)}>{subtugas.status}</span>
        </div>
      </div>

      <div className="mt-2"><ProgressBar value={subtugas.progress} /></div>

      {/* Render riwayat update dari Anggota saja (tanpa system note) */}
      {visibleUpdates.length > 0 && (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 text-sm">
          <div className="mt-2 space-y-2">
            {visibleUpdates.map((u) => (
              <div key={u.id} className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-100">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{u.persentase}%</span>
                  <span>{formatDate(u.created_at)}</span>
                </div>
                <p className="text-gray-600">{u.catatan || 'Tidak ada catatan dari anggota.'}</p>
                {u.files?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {u.files.map((f) => (
                      <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                        <Paperclip size={12} /> {f.file_name || `Bukti ${f.id}`}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(canVerifikasiKatim || canVerifikasiKasubag) && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <textarea className="input mb-2" rows={2} placeholder="Catatan (wajib jika ditolak)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => verifikasi(canVerifikasiKatim ? 'katim' : 'kasubag', 'disetujui')} className="btn btn-success text-sm">
              <CheckCircle2 size={15} /> Verifikasi & Setujui
            </button>
            <button disabled={busy} onClick={() => verifikasi(canVerifikasiKatim ? 'katim' : 'kasubag', 'ditolak')} className="btn btn-danger text-sm">
              <XCircle size={15} /> Kembalikan
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
          <MessageSquare size={13} /> Catatan untuk subtugas ini
        </p>
        {comments.length > 0 && (
          <div className="space-y-2 mb-2">
            {comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium text-gray-800">{c.user?.name}</span>{' '}
                <span className="text-xs text-gray-400">({c.user?.role})</span>
                <p className="text-gray-600">{c.komentar}</p>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Tulis catatan untuk subtugas ini..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button type="submit" disabled={sendingComment} className="btn btn-secondary text-sm">
            <Send size={14} />
          </button>
        </form>
      </div>

      {canManageSubtugas && (
        <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditFiles([]); }} title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Edit Subtugas</span>}>
          <form onSubmit={handleEdit} className="space-y-4">
            {editError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{editError}</div>}
            
            <div>
              <label className="label">Judul Subtugas</label>
              <input required className="input" value={editForm.judul} onChange={(e) => setEditForm({ ...editForm, judul: e.target.value })} />
            </div>
            
            <div>
              <label className="label">Deskripsi</label>
              <textarea className="input" rows={2} value={editForm.deskripsi} onChange={(e) => setEditForm({ ...editForm, deskripsi: e.target.value })} />
            </div>
            
            {/* Tampilkan Lampiran dari Subtugas di form edit */}
            {lampiranAtasan.length > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <label className="label text-gray-700">Lampiran Saat Ini</label>
                <div className="space-y-2 mt-2">
                  {lampiranAtasan.map((f) => (
                    <div key={f.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-2">
                      <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-brand-600 hover:underline truncate mr-2">
                        <Paperclip size={14} className="flex-shrink-0" />
                        <span className="truncate">{f.file_name || `File ${f.id}`}</span>
                      </a>
                      <button type="button" onClick={() => handleDeleteFile(f.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors flex-shrink-0" title="Hapus file ini">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="label">Tambahkan Lampiran Baru (Opsional)</label>
              <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-lg py-4 px-4 cursor-pointer hover:border-brand-400 text-sm text-gray-500 text-center">
                <UploadCloud size={20} />
                {editFiles.length > 0 ? (
                  <div className="flex flex-col items-center mt-2 w-full">
                    <span className="font-semibold text-brand-600 mb-1">{editFiles.length} file dipilih:</span>
                    {editFiles.map((f, index) => (
                      <span key={index} className="text-xs text-gray-600 truncate max-w-xs sm:max-w-sm w-full">
                        • {f.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span>Klik untuk melampirkan file tambahan</span>
                )}
                <input type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip" onChange={(e) => setEditFiles(Array.from(e.target.files))} />
              </label>
            </div>

            <div>
              <label className="label">Assign ke Anggota</label>
              <select required className="input" value={editForm.assigned_to} onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}>
                <option value="">Pilih anggota...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                {editForm.assigned_to && !users.some((u) => String(u.id) === String(editForm.assigned_to)) && subtugas.assignee && (
                  <option value={subtugas.assignee.id}>{subtugas.assignee.name}</option>
                )}
              </select>
            </div>
            
            <div>
              <label className="label">Deadline (opsional)</label>
              <input type="date" className="input" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} />
            </div>
            
            <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={editSaving}>
              {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </Modal>
      )}

      {canManageSubtugas && (
        <Modal
          open={deleteOpen}
          onClose={() => !deleting && setDeleteOpen(false)}
          title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Hapus Subtugas</span>}
        >
          <div className="space-y-4">
            {deleteError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{deleteError}</div>}
            <div className="flex items-start gap-3 bg-red-50 text-red-700 rounded-lg px-4 py-3">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Yakin ingin menghapus subtugas <span className="font-semibold">"{subtugas.judul}"</span>?
                Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Batal
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Menghapus...' : 'Ya, Hapus Subtugas'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}