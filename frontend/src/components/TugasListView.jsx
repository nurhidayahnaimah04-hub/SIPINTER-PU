import { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { Link, useSearchParams } from 'react-router-dom'
import { usePeriode } from '../context/PeriodeContext'
import Modal from './Modal'
import ProgressBar from './ProgressBar'
import Loading from './Loading'
import EmptyState from './EmptyState'
import { formatDate, statusBadgeClass } from '../lib/helpers'
import { Plus, Search, Layers, Pencil, Trash2, AlertTriangle } from 'lucide-react'

const STATUSES = ['Belum Dimulai', 'Sedang Berjalan', 'Menunggu Verifikasi', 'Selesai', 'Terlambat']
const TANPA_KODE = '__tanpa_kode__'
const UMUM_KODE = 'TUGAS UMUM'

function groupTugasByKodeTim(tugasList) {
  const groups = new Map()
  for (const t of tugasList) {
    if (!t.team_id) {
      if (!groups.has(UMUM_KODE)) {
        groups.set(UMUM_KODE, { kode_tim: UMUM_KODE, nama_tim: 'Tugas Lintas Tim', items: [] })
      }
      groups.get(UMUM_KODE).items.push(t)
    } else {
      const kode = t.team?.kode_tim?.trim() || TANPA_KODE
      if (!groups.has(kode)) {
        groups.set(kode, { kode_tim: kode, nama_tim: t.team?.nama_tim || '-', items: [] })
      }
      groups.get(kode).items.push(t)
    }
  }
  return [...groups.values()].sort((a, b) => {
    if (a.kode_tim === UMUM_KODE) return -1
    if (b.kode_tim === UMUM_KODE) return 1
    if (a.kode_tim === TANPA_KODE) return 1
    if (b.kode_tim === TANPA_KODE) return -1
    return a.kode_tim.localeCompare(b.kode_tim)
  })
}

export default function TugasListView({ basePath, canCreate, title, subtitle, groupByTeam }) {
  const { periode } = usePeriode()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tugasList, setTugasList] = useState(null)
  const [teams, setTeams] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState(searchParams.get('team_id') || '')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ judul: '', deskripsi: '', deadline: '', team_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    if (!periode.periode_id) return
    api.get('/tugas', {
      params: {
        search,
        status: statusFilter,
        team_id: teamFilter || undefined,
        periode_id: periode.periode_id,
        semester: periode.semester,
      },
    }).then((res) => setTugasList(res.data.data))
  }

  function handleTeamFilterChange(val) {
    setTeamFilter(val)
    setSearchParams(val ? { team_id: val } : {})
  }

  useAutoRefresh(load, [search, statusFilter, teamFilter, periode.periode_id, periode.semester])
  useEffect(() => { if (canCreate || groupByTeam) api.get('/teams').then((res) => setTeams(res.data)) }, [canCreate, groupByTeam])

  const groupedTugas = useMemo(() => {
    if (!groupByTeam || !tugasList) return null
    return groupTugasByKodeTim(tugasList)
  }, [groupByTeam, tugasList])

  const teamOptions = useMemo(() => {
    return [...teams].sort((a, b) => (a.kode_tim || a.nama_tim).localeCompare(b.kode_tim || b.nama_tim))
  }, [teams])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/tugas', { ...form, periode_id: periode.periode_id })
      setOpen(false)
      setForm({ judul: '', deskripsi: '', deadline: '', team_id: '' })
      load()
    } catch (err) {
      // KRUSIAL: Tampilkan pesan error asli dari backend
      setError(err.response?.data?.message || 'Gagal membuat tugas. Periksa kembali data.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        {canCreate && <button onClick={() => setOpen(true)} className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60"><Plus size={16} /> Buat Tugas</button>}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="     Cari judul atau deskripsi..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-56" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {groupByTeam && (
          <select className="input sm:w-64" value={teamFilter} onChange={(e) => handleTeamFilterChange(e.target.value)}>
            <option value="">Semua Kategori (Kode Tim)</option>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.kode_tim ? `${t.kode_tim} — ${t.nama_tim}` : t.nama_tim}</option>
            ))}
          </select>
        )}
      </div>

      {!tugasList ? <Loading /> : !tugasList.length ? <EmptyState text="Belum ada tugas pada periode ini." /> : groupByTeam ? (
        <div className="space-y-10">
          {groupedTugas.map((group, i) => (
            <div key={group.kode_tim} className={i > 0 ? 'pt-8 border-t border-gray-200' : ''}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${group.kode_tim === UMUM_KODE ? 'bg-blue-100 text-blue-800' : 'bg-brand-50 text-brand-700'}`}>
                  <Layers size={12} />
                  {group.kode_tim === TANPA_KODE ? 'Tanpa Kode Tim' : group.kode_tim}
                </span>
                <h2 className="font-semibold text-gray-900">{group.nama_tim}</h2>
                <span className="text-xs text-gray-400">({group.items.length} tugas)</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {group.items.map((t) => <TugasCard key={t.id} t={t} basePath={basePath} canManage={canCreate} onChanged={load} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {tugasList.map((t) => <TugasCard key={t.id} t={t} basePath={basePath} canManage={canCreate} onChanged={load} />)}
        </div>
      )}

      {canCreate && (
        <Modal   open={open} onClose={() => setOpen(false)} title={ <span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]"> Buat Tugas Baru </span>} wide>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Periode: Tahun {periode.tahun} (ubah lewat pemilih periode di atas). Tugas ini akan
              tersimpan di tahun tersebut dan progresnya berlanjut otomatis dari Semester 1 ke Semester 2.
            </p>
            <div>
              <label className="label">Judul Tugas</label>
              <input required className="input" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
            </div>
            <div>
              <label className="label">Deskripsi</label>
              <textarea className="input" rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <div>
              <label className="label">Deadline (opsional)</label>
              <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div>
              <label className="label">Assign ke Tim (Katim)</label>
              <select className="input" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
                <option value="">Tugas Umum (Lintas Tim)</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.nama_tim} {t.kode_tim ? `(${t.kode_tim})` : ''} — Katim: {t.katim?.name}</option>)}
              </select>
            </div>
            <button className="w-full py-2.5 rounded-lg font-medium bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60" disabled={saving}>{saving ? 'Menyimpan...' : 'Buat Tugas'}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function TugasCard({ t, basePath, canManage, onChanged }) {
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ judul: t.judul, deskripsi: t.deskripsi || '', deadline: (t.deadline || '').slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  function openEdit(e) {
    e.preventDefault()
    e.stopPropagation()
    setForm({ judul: t.judul, deskripsi: t.deskripsi || '', deadline: (t.deadline || '').slice(0, 10) })
    setError('')
    setEditOpen(true)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put(`/tugas/${t.id}`, form)
      setEditOpen(false)
      onChanged?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan perubahan.')
    } finally {
      setSaving(false)
    }
  }

  function openDelete(e) {
    e.preventDefault()
    e.stopPropagation()
    setDeleteError('')
    setDeleteOpen(true)
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/tugas/${t.id}`)
      setDeleteOpen(false)
      onChanged?.()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus tugas.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Link to={`${basePath}/${t.id}`} className="card p-5 hover:shadow-md transition-shadow relative border-l-4 border-transparent hover:border-brand-500">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 pr-14 flex items-center gap-2">
            {!t.team_id && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] uppercase font-bold tracking-wider">Umum</span>}
            {t.judul}
          </h3>
          {canManage && (
            <div className="absolute top-4 right-4 flex items-center gap-1">
              <button onClick={openEdit} title="Edit tugas" className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50">
                <Pencil size={14} />
              </button>
              <button onClick={openDelete} title="Hapus tugas" className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">Tim: {t.team_id ? t.team?.nama_tim : 'Tidak terikat tim'} · {t.subtugas_count} subtugas</p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progress</span><span>{t.progress}%</span></div>
          <ProgressBar value={t.progress} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className={statusBadgeClass(t.status)}>{t.status}</span>
          {t.deadline && <span className="text-xs text-gray-400">Deadline: {formatDate(t.deadline)}</span>}
        </div>
      </Link>

      {canManage && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title={<span className="inline-block -mx-6 -mt-6 mb-2 px-6 py-4 bg-pupr-yellow text-pupr-blue-dark font-semibold rounded-t-xl w-[calc(100%+3rem)]">Edit Tugas</span>}>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div>
              <label className="label">Judul Tugas</label>
              <input required className="input" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
            </div>
            <div>
              <label className="label">Deskripsi</label>
              <textarea className="input" rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <div>
              <label className="label">Deadline (opsional)</label>
              <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <button className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 w-full" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
          </form>
        </Modal>
      )}

      {canManage && (
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
                Yakin ingin menghapus tugas <span className="font-semibold">"{t.judul}"</span>?
                Semua subtugas di dalamnya ikut terhapus. Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Batal
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Menghapus...' : 'Ya, Hapus Tugas'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}