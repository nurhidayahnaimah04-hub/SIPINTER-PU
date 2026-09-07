import { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { useAuth } from '../context/AuthContext'
import ProgressBar from './ProgressBar'
import Modal from './Modal'
import Loading from './Loading'
import EmptyState from './EmptyState'
import SubtugasRow from './SubtugasRow'
import { formatDate, statusBadgeClass } from '../lib/helpers'
import { usePeriode } from '../context/PeriodeContext'
import { ArrowLeft, Plus, MessageSquare, CheckCircle2, XCircle, Copy, Pencil, Trash2, AlertTriangle, UploadCloud } from 'lucide-react'

// role: 'kabalai' | 'kasubag' | 'katim'
export default function TugasDetailView({ basePath, role }) {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tugas, setTugas] = useState(null)

  const [subtugasOpen, setSubtugasOpen] = useState(false)
  const [form, setForm] = useState({ judul: '', deskripsi: '', assigned_to: '', deadline: '' })
  
  // State untuk menyimpan daftar file yang akan diupload saat buat subtugas
  const [subtugasFiles, setSubtugasFiles] = useState([])
  const [subtugasError, setSubtugasError] = useState('')

  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState([])
  const [verifNote, setVerifNote] = useState('')

  const { periodes } = usePeriode()
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [targetPeriodeId, setTargetPeriodeId] = useState('')
  const [salinSubtugas, setSalinSubtugas] = useState(true)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateError, setDuplicateError] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ judul: '', deskripsi: '', deadline: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // LOGIKA AKSES
  const isTugasUmum = tugas && tugas.team_id === null;
  // Jika Tugas Umum, HANYA katim yang bisa buat subtugas. Jika tugas biasa, katim/kasubag bisa.
  const canCreateSubtugas = tugas && (isTugasUmum ? role === 'katim' : (role === 'katim' || role === 'kasubag'));
  
  const canVerifikasiTugas = role === 'kasubag'
  const canDuplicate = role === 'kasubag'
  const canEditTugas = role === 'kasubag'

  function load() {
    api.get(`/tugas/${id}`).then((res) => setTugas(res.data))
    api.get('/comments', { params: { tugas_id: id } }).then((res) => setComments(res.data))
  }

  useAutoRefresh(load, [id])

  // LOGIKA ANGGOTA YANG BENAR:
  const availableUsers = useMemo(() => {
    if (!tugas) return [];
    
    // Jika ini Tugas Umum dan yang buka adalah Katim, pakai anggota timnya sendiri
    // (Data ini sudah dikirim dari backend via properti my_team_members)
    if (isTugasUmum && role === 'katim') {
      return tugas.my_team_members || [];
    }
    
    // Jika ini tugas biasa, pakai list anggota dari tim pemilik tugas
    return tugas.team?.members || [];
  }, [tugas, isTugasUmum, role]);

  // Menggunakan FormData untuk mendukung Upload File Multi
  async function handleAddSubtugas(e) {
    e.preventDefault()
    setSaving(true)
    setSubtugasError('')
    try {
      const formData = new FormData();
      formData.append('judul', form.judul);
      formData.append('deskripsi', form.deskripsi);
      formData.append('assigned_to', form.assigned_to);
      if (form.deadline) formData.append('deadline', form.deadline);
      
      subtugasFiles.forEach((f) => formData.append('files', f));

      await api.post(`/tugas/${id}/subtugas`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setSubtugasOpen(false)
      setForm({ judul: '', deskripsi: '', assigned_to: '', deadline: '' })
      setSubtugasFiles([]) // Bersihkan form file setelah berhasil
      load()
    } catch (err) {
      setSubtugasError(err.response?.data?.message || 'Gagal menambahkan subtugas.')
    } finally {
      setSaving(false)
    }
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    const res = await api.post('/comments', { tugas_id: id, komentar: comment })
    setComments([...comments, res.data])
    setComment('')
  }

  async function handleVerifikasiTugas(keputusan) {
    if (keputusan === 'ditolak' && !verifNote.trim()) {
      alert('Isi catatan alasan pengembalian.')
      return
    }
    await api.post(`/tugas/${id}/verifikasi`, { keputusan, catatan: verifNote })
    setVerifNote('')
    load()
  }

  async function handleDuplicate(e) {
    e.preventDefault()
    setDuplicateError('')
    if (!targetPeriodeId) {
      setDuplicateError('Pilih periode/tahun tujuan.')
      return
    }
    setDuplicating(true)
    try {
      await api.post(`/tugas/${id}/duplicate`, {
        periode_id: targetPeriodeId,
        salin_subtugas: salinSubtugas,
      })
      setDuplicateOpen(false)
      setTargetPeriodeId('')
      alert(`Tugas berhasil diduplikasi ke periode baru. Progres dimulai dari 0%.`)
    } catch (err) {
      setDuplicateError(err.response?.data?.message || 'Gagal menduplikasi tugas.')
    } finally {
      setDuplicating(false)
    }
  }

  function openEditTugas() {
    setEditForm({
      judul: tugas.judul,
      deskripsi: tugas.deskripsi || '',
      deadline: (tugas.deadline || '').slice(0, 10),
    })
    setEditError('')
    setEditOpen(true)
  }

  async function handleEditTugas(e) {
    e.preventDefault()
    setEditSaving(true)
    setEditError('')
    try {
      await api.put(`/tugas/${id}`, editForm)
      setEditOpen(false)
      load()
    } catch (err) {
      setEditError(err.response?.data?.message || 'Gagal menyimpan perubahan.')
    } finally {
      setEditSaving(false)
    }
  }

  function openDeleteTugas() {
    setDeleteError('')
    setDeleteOpen(true)
  }

  async function handleDeleteTugas() {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/tugas/${id}`)
      navigate(basePath)
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus tugas.')
    } finally {
      setDeleting(false)
    }
  }

  if (!tugas) return <Loading />

  return (
    <div>
      <Link to={basePath} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Kembali
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              {isTugasUmum && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] uppercase font-bold tracking-wider">Umum</span>}
              {tugas.judul}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tim: {!isTugasUmum ? `${tugas.team?.nama_tim} (${tugas.team?.kode_tim}) · Katim: ${tugas.team?.katim?.name}` : 'Tidak terikat tim (Tugas Umum)'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Periode: Tahun {tugas.periode?.tahun}</p>
          </div>
          <div className="flex items-center gap-2">
            {canEditTugas && (
              <>
                <button onClick={openEditTugas} title="Edit tugas" className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50">
                  <Pencil size={16} />
                </button>
                <button onClick={openDeleteTugas} title="Hapus tugas" className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <span className={statusBadgeClass(tugas.status)}>{tugas.status}</span>
          </div>
        </div>
        {canDuplicate && (
          <button
            onClick={() => setDuplicateOpen(true)}
            className="btn btn-secondary text-xs mt-3"
            title="Salin tugas & subtugas ini ke tahun anggaran lain, progres mulai dari 0%"
          >
            <Copy size={14} /> Duplikasi ke Periode Lain
          </button>
        )}
        <p className="text-sm text-gray-600 mt-4">{tugas.deskripsi || 'Tidak ada deskripsi.'}</p>
        <div className="mt-5">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress Keseluruhan</span><span className="font-medium">{tugas.progress}%</span>
          </div>
          <ProgressBar value={tugas.progress} />
        </div>
        {tugas.deadline && <p className="text-xs text-gray-400 mt-3">Deadline: {formatDate(tugas.deadline)}</p>}

        {canVerifikasiTugas && tugas.status === 'Menunggu Verifikasi' && !isTugasUmum && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-800 mb-2">Verifikasi Akhir Tugas</p>
            <p className="text-xs text-gray-500 mb-2">Semua subtugas sudah selesai. Verifikasi untuk menutup tugas ini.</p>
            <textarea className="input mb-2" rows={2} placeholder="Catatan (opsional)" value={verifNote} onChange={(e) => setVerifNote(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => handleVerifikasiTugas('disetujui')} className="btn btn-success"><CheckCircle2 size={16} /> Verifikasi</button>
              <button onClick={() => handleVerifikasiTugas('ditolak')} className="btn btn-danger"><XCircle size={16} /> Kembalikan</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Subtugas ({tugas.subtugas?.length || 0})</h2>
        {canCreateSubtugas && (
          <button onClick={() => setSubtugasOpen(true)} className="btn btn-secondary text-sm"><Plus size={15} /> Tambah Subtugas</button>
        )}
      </div>

      {!tugas.subtugas?.length ? <EmptyState text="Belum ada subtugas." /> : (
        <div className="space-y-3 mb-6">
          {tugas.subtugas.map((s) => (
            <SubtugasRow key={s.id} subtugas={s} role={role} onChanged={load} users={availableUsers} />
          ))}
        </div>
      )}

      <Modal open={subtugasOpen} onClose={() => { setSubtugasOpen(false); setSubtugasFiles([]); }} title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Tambah Subtugas</span>}>
        <form onSubmit={handleAddSubtugas} className="space-y-4">
          {subtugasError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{subtugasError}</div>}
          
          <div>
            <label className="label">Judul Subtugas</label>
            <input required className="input" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea className="input" rows={2} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
          </div>
          
          <div>
            <label className="label">Lampiran / Berkas Tambahan (Opsional)</label>
            <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-lg py-4 px-4 cursor-pointer hover:border-brand-400 text-sm text-gray-500 text-center">
              <UploadCloud size={20} />
              {subtugasFiles.length > 0 ? (
                <div className="flex flex-col items-center mt-2 w-full">
                  <span className="font-semibold text-brand-600 mb-1">{subtugasFiles.length} file dipilih:</span>
                  {subtugasFiles.map((f, index) => (
                    <span key={index} className="text-xs text-gray-600 truncate max-w-xs sm:max-w-sm w-full">
                      • {f.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span>Klik untuk melampirkan file</span>
              )}
              <input type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip" onChange={(e) => setSubtugasFiles(Array.from(e.target.files))} />
            </label>
          </div>

          <div>
            <label className="label">Assign ke Anggota</label>
            <select required className="input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">Pilih anggota...</option>
              {availableUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Deadline (opsional)</label>
            <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          
          <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Tambah Subtugas'}
          </button>
        </form>
      </Modal>

      {canEditTugas && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Edit Tugas</span>}>
          <form onSubmit={handleEditTugas} className="space-y-4">
            {editError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{editError}</div>}
            <div>
              <label className="label">Judul Tugas</label>
              <input required className="input" value={editForm.judul} onChange={(e) => setEditForm({ ...editForm, judul: e.target.value })} />
            </div>
            <div>
              <label className="label">Deskripsi</label>
              <textarea className="input" rows={3} value={editForm.deskripsi} onChange={(e) => setEditForm({ ...editForm, deskripsi: e.target.value })} />
            </div>
            <div>
              <label className="label">Deadline (opsional)</label>
              <input type="date" className="input" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} />
            </div>
            <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={editSaving}>{editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
          </form>
        </Modal>
      )}

      {canEditTugas && (
        <Modal
          open={deleteOpen}
          onClose={() => !deleting && setDeleteOpen(false)}
          title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Hapus Tugas</span>}
        >
          <div className="space-y-4">
            {deleteError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{deleteError}</div>}
            <div className="flex items-start gap-3 bg-red-50 text-red-700 rounded-lg px-4 py-3">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Yakin ingin menghapus tugas <span className="font-semibold">"{tugas.judul}"</span>?
                Semua subtugas di dalamnya ikut terhapus. Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Batal
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteTugas} disabled={deleting}>
                {deleting ? 'Menghapus...' : 'Ya, Hapus Tugas'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Modal open={duplicateOpen} onClose={() => setDuplicateOpen(false)} title="Duplikasi Tugas ke Periode Lain">
        <form onSubmit={handleDuplicate} className="space-y-4">
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Fitur ini membuat salinan tugas ini (beserta subtugasnya bila dicentang) di tahun anggaran lain.
            Progres tugas baru akan mulai dari 0% -- tugas & subtugas yang sekarang tidak berubah.
            Gunakan ini hanya saat pindah ke <b>tahun anggaran baru</b>; pindah semester dalam tahun
            yang sama tidak perlu duplikasi apa pun, progres berlanjut otomatis.
          </p>
          {duplicateError && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{duplicateError}</div>}
          <div>
            <label className="label">Periode/Tahun Tujuan</label>
            <select required className="input" value={targetPeriodeId} onChange={(e) => setTargetPeriodeId(e.target.value)}>
              <option value="">Pilih periode...</option>
              {periodes.filter((p) => p.id !== tugas.periode_id).map((p) => (
                <option key={p.id} value={p.id}>Tahun {p.tahun}{p.status === 'aktif' ? ' (Aktif)' : ''}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={salinSubtugas} onChange={(e) => setSalinSubtugas(e.target.checked)} />
            Salin juga daftar subtugas (tanpa progres/riwayat lama)
          </label>
          <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={duplicating}>
            {duplicating ? 'Menduplikasi...' : 'Duplikasi Tugas'}
          </button>
        </form>
      </Modal>
    </div>
  )
}