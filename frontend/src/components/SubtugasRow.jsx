import { useEffect, useState } from 'react'
import ProgressBar from './ProgressBar'
import Modal from './Modal'
import { formatDate, statusBadgeClass } from '../lib/helpers'
import { Paperclip, CheckCircle2, XCircle, Lock, MessageSquare, Send, Pencil, Trash2, AlertTriangle, X, Link as LinkIcon, Plus } from 'lucide-react'
import api from '../lib/api'

export default function SubtugasRow({ subtugas, role, onChanged, users = [] }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  
  const [fallbackUsers, setFallbackUsers] = useState([])

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ judul: '', deskripsi: '', assigned_to: [], deadline: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editFiles, setEditFiles] = useState([]) 
  
  const [attachMode, setAttachMode] = useState('file') // 'file' atau 'link'
  const [editLinks, setEditLinks] = useState([])
  const [linkInput, setLinkInput] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [currentUserId, setCurrentUserId] = useState(null)

  const canVerifikasiKatim = role === 'katim' && subtugas.status === 'Menunggu Verifikasi Katim'
  const canVerifikasiKasubag = role === 'kasubag' && subtugas.status === 'Menunggu Verifikasi Kasubag'
  const canManageSubtugas = ['kasubag', 'katim', 'anggota', 'kabalai'].includes(role)

  useEffect(() => {
    api.get('/me')
      .then((res) => {
        if (res.data?.id) setCurrentUserId(res.data.id);
      })
      .catch((err) => console.error("Gagal memuat profil user:", err));
  }, []);

  useEffect(() => {
    api.get('/users-lite')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setFallbackUsers(res.data);
        }
      })
      .catch((err) => console.error("Gagal memuat daftar user lite:", err));
  }, [users]);

  const availableUsersList = users && users.length > 0 ? users : fallbackUsers;

  const oldSystemFiles = subtugas.updates
    ?.filter(u => u.catatan === 'Lampiran subtugas' || u.catatan === 'Lampiran awal subtugas' || u.catatan?.startsWith('Penambahan lampiran'))
    ?.flatMap(u => u.files || []) || [];
  
  const lampiranAtasan = [...(subtugas.files || []), ...oldSystemFiles];

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
    let initialAssignees = [];
    if (subtugas.assignees && subtugas.assignees.length > 0) {
      initialAssignees = subtugas.assignees.map(a => a.id);
    } else if (subtugas.assigned_to) {
      initialAssignees = Array.isArray(subtugas.assigned_to) ? subtugas.assigned_to : [subtugas.assigned_to];
    } else if (subtugas.assignee?.id) {
      initialAssignees = [subtugas.assignee.id];
    }

    setEditForm({
      judul: subtugas.judul,
      deskripsi: subtugas.deskripsi || '',
      assigned_to: initialAssignees,
      deadline: (subtugas.deadline || '').slice(0, 10),
    })
    setEditFiles([]) 
    setEditLinks([])
    setLinkInput('')
    setAttachMode('file')
    setEditError('')
    setEditOpen(true)
  }

  function handleAddLink() {
    if (!linkInput.trim()) return;
    let urlFormatted = linkInput.trim();
    if (!/^https?:\/\//i.test(urlFormatted)) {
      urlFormatted = 'https://' + urlFormatted;
    }
    setEditLinks([...editLinks, urlFormatted]);
    setLinkInput('');
  }

  function handleRemoveLink(index) {
    setEditLinks(editLinks.filter((_, idx) => idx !== index));
  }

  async function handleEdit(e) {
    e.preventDefault()
    
    const assignedArray = Array.isArray(editForm.assigned_to) ? editForm.assigned_to : [];
    if (assignedArray.length === 0) {
      setEditError('Pilih minimal 1 anggota tim pelaksana.')
      return
    }

    if (!editForm.deadline) {
      setEditError('Tanggal deadline wajib diisi.')
      return
    }

    setEditSaving(true)
    setEditError('')
    try {
      const formData = new FormData()
      formData.append('judul', editForm.judul)
      formData.append('deskripsi', editForm.deskripsi)
      formData.append('deadline', editForm.deadline)
      formData.append('assigned_to', JSON.stringify(assignedArray))

      editFiles.forEach((f) => formData.append('files', f))

      if (editLinks.length > 0) {
        formData.append('links', JSON.stringify(editLinks))
      }

      await api.put(`/subtugas/${subtugas.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setEditOpen(false)
      setEditFiles([])
      setEditLinks([])
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

  async function handleDeleteUpdate(updateId) {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan progres ini?")) return;
    try {
      await api.delete(`/subtugas/updates/${updateId}`);
      onChanged?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus progres.');
    }
  }

  const displayAssignees = subtugas.assignees && subtugas.assignees.length > 0
    ? subtugas.assignees.map(a => a.name).join(', ')
    : (subtugas.assignee?.name || 'Belum ada pelaksana');

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 pr-4">
          <p className="font-medium text-gray-900 flex items-center gap-1.5">
            {subtugas.judul}
            {subtugas.locked && <Lock size={13} className="text-gray-400" />}
          </p>
          
          <p className="text-xs text-gray-500 mt-1 mb-2">
            <span className="font-medium text-gray-700">{displayAssignees}</span>
            {subtugas.deadline ? ` • Deadline ${formatDate(subtugas.deadline)}` : ''}
          </p>

          {subtugas.deskripsi && (
            <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{subtugas.deskripsi}</p>
          )}

          {lampiranAtasan.length > 0 && (
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 mb-3 w-full">
              <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                <Paperclip size={13} /> Lampiran Subtugas
              </p>
              <div className="flex flex-wrap gap-2">
                {lampiranAtasan.map((f) => (
                  <a 
                    key={f.id} 
                    href={f.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-1 text-xs text-brand-600 hover:underline bg-white px-2 py-1.5 rounded border border-gray-200 hover:border-brand-300 transition-colors"
                  >
                    {f.file_type === 'link' ? (
                      <LinkIcon size={12} className="text-blue-500" />
                    ) : (
                      <Paperclip size={12} className="text-brand-500" />
                    )} 
                    {f.file_name || `Lampiran ${f.id}`}
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

      {visibleUpdates.length > 0 && (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 text-sm">
          <div className="mt-2 space-y-2">
            {visibleUpdates.map((u) => {
              const isOwner = currentUserId && u.user_id === currentUserId;
              const isAtasan = ['katim', 'kasubag', 'kabalai'].includes(role);
              const canDeleteProgress = isOwner || isAtasan;

              return (
                <div key={u.id} className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-100 relative">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                    {/* MENAMPILKAN PERSENTASE DAN STATUS SUBTUGAS SECARA LENGKAP */}
                    <span>
                      Progres {u.progress ?? u.persentase}% {subtugas.status ? `- ${subtugas.status}` : ''} {u.user?.name ? `oleh ${u.user.name}` : ''}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <span>{formatDate(u.created_at)}</span>
                      
                      {canDeleteProgress && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUpdate(u.id)}
                          title="Hapus progres ini"
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600">{u.catatan || 'Tidak ada catatan dari anggota.'}</p>
                  
                  {u.files?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {u.files.map((f) => (
                        <a 
                          key={f.id} 
                          href={f.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-1 text-xs text-brand-600 hover:underline bg-white px-2 py-1 rounded border border-gray-200"
                        >
                          {f.file_type === 'link' ? (
                            <LinkIcon size={12} className="text-blue-500" />
                          ) : (
                            <Paperclip size={12} className="text-brand-500" />
                          )} 
                          {f.file_name || `Bukti ${f.id}`}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
        <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditFiles([]); setEditLinks([]); }} title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Edit Subtugas</span>}>
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
            
            {lampiranAtasan.length > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <label className="label text-gray-700">Lampiran Saat Ini</label>
                <div className="space-y-2 mt-2">
                  {lampiranAtasan.map((f) => (
                    <div key={f.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-2">
                      <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-brand-600 hover:underline truncate mr-2">
                        {f.file_type === 'link' ? <LinkIcon size={14} className="text-blue-500 flex-shrink-0" /> : <Paperclip size={14} className="flex-shrink-0" />}
                        <span className="truncate">{f.file_name || `File ${f.id}`}</span>
                      </a>
                      <button type="button" onClick={() => handleDeleteFile(f.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors flex-shrink-0" title="Hapus lampiran ini">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opsi Lampiran (File / Link) */}
            <div>
              <label className="label">Tambahkan Lampiran Baru (Opsional)</label>
              
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit text-xs font-semibold mb-2">
                <button
                  type="button"
                  onClick={() => setAttachMode('file')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    attachMode === 'file' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📁 Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setAttachMode('link')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    attachMode === 'link' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🔗 Sematkan Link
                </button>
              </div>

              {attachMode === 'file' ? (
                <label className="flex items-center justify-between border border-gray-300 rounded-lg p-3 cursor-pointer hover:bg-gray-50 text-sm text-gray-600 transition-colors">
                  <div className="flex items-center gap-2">
                    <Paperclip size={16} className="text-gray-400" />
                    <span>
                      {editFiles.length > 0 ? (
                        <span className="font-medium text-brand-600">{editFiles.length} file dipilih</span>
                      ) : (
                        <span>Pilih file dokumen / foto <small className="text-gray-400">(maks 5 MB)</small></span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs bg-gray-100 px-2.5 py-1 rounded border text-gray-600 font-medium">Cari File</span>

                  <input
                    type="file"
                    multiple
                    hidden
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip"
                    onChange={(e) => {
                      const selectedFiles = Array.from(e.target.files);
                      const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

                      const isOverSize = selectedFiles.some((file) => file.size > MAX_SIZE);

                      if (isOverSize) {
                        alert("Ada file yang ukurannya melebihi 5 MB! Harap pilih file yang lebih kecil.");
                        e.target.value = "";
                        return;
                      }

                      setEditFiles(selectedFiles);
                    }}
                  />
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {/* Menggunakan type="text" agar pengguna bebas menempelkan link tanpa diblokir validasi bawaan browser */}
                    <input
                      type="text"
                      placeholder="Tempelkan URL (contoh: drive.google.com/xyz)"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      className="input flex-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddLink}
                      className="btn bg-blue-900 text-white text-xs px-3 hover:bg-blue-950 flex items-center gap-1"
                    >
                      <Plus size={14} /> Tambah
                    </button>
                  </div>
                </div>
              )}

              {/* List File Terpilih */}
              {editFiles.length > 0 && attachMode === 'file' && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {editFiles.map((f, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200">
                      📄 <span className="max-w-xs truncate">{f.name}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* List Link Terpilih */}
              {editLinks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {editLinks.map((link, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-200">
                      🔗 <span className="max-w-xs truncate">{link}</span>
                      <button type="button" onClick={() => handleRemoveLink(idx)} className="text-red-500 font-bold ml-1 hover:text-red-700">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Anggota Tim Pelaksana</label>
                {availableUsersList.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-brand-600 font-semibold hover:underline"
                    onClick={() => {
                      const currentArray = Array.isArray(editForm.assigned_to) ? editForm.assigned_to : [];
                      if (currentArray.length === availableUsersList.length) {
                        setEditForm({ ...editForm, assigned_to: [] });
                      } else {
                        setEditForm({ ...editForm, assigned_to: availableUsersList.map((u) => u.id) });
                      }
                    }}
                  >
                    {Array.isArray(editForm.assigned_to) && editForm.assigned_to.length === availableUsersList.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-300 bg-white p-2.5 shadow-sm space-y-1">
                {availableUsersList && availableUsersList.length > 0 ? (
                  availableUsersList.map((u) => {
                    const isChecked = Array.isArray(editForm.assigned_to) && editForm.assigned_to.includes(u.id);

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
                            const currentList = Array.isArray(editForm.assigned_to) ? editForm.assigned_to : [];
                            if (e.target.checked) {
                              setEditForm({ ...editForm, assigned_to: [...currentList, u.id] });
                            } else {
                              setEditForm({ ...editForm, assigned_to: currentList.filter((id) => id !== u.id) });
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
                Terpilih: <span className="font-bold text-blue-600">{Array.isArray(editForm.assigned_to) ? editForm.assigned_to.length : 0}</span> orang
              </p>
            </div>
            
            <div>
              <label className="label">Deadline</label>
              <input type="date" required className="input" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} />
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
                Tindakan me-reset ini tidak bisa dibatalkan.
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