import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { notifyNotificationsChanged } from '../lib/notificationBus'
import { formatDate } from '../lib/helpers'
import { Bell, CheckCheck, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNotificationStream } from '../lib/notificationStream'
import EmptyState from './EmptyState'
import Loading from './Loading'
import Modal from './Modal'

export default function NotificationsList() {
  const navigate = useNavigate()
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)

  function load() {
    api.get('/notifications', { params: { page } }).then((res) => setMeta(res.data))
  }

  useAutoRefresh(load, [page])

  // Notif baru dari SSE cuma disisipkan kalau lagi di halaman 1 (paling atas/terbaru).
  // Kalau lagi buka halaman 2 dst, biarkan saja -- nanti kelihatan begitu balik ke
  // halaman 1, supaya urutan & jumlah per halaman tidak berantakan.
  useNotificationStream((notif) => {
    if (page !== 1) return
    setMeta((prev) => (prev ? { ...prev, data: [notif, ...prev.data].slice(0, prev.per_page) } : prev))
    notifyNotificationsChanged()
  })

  async function markRead(id) {
    await api.post(`/notifications/${id}/read`)
    notifyNotificationsChanged()
    load()
  }

  async function markAll() {
    await api.post('/notifications/read-all')
    notifyNotificationsChanged()
    load()
  }

  async function handleOpen(n) {
    setDetail(n)
    if (!n.is_read) await markRead(n.id)
  }

  function handleGoToLink() {
    if (!detail?.link) return
    const link = detail.link
    setDetail(null)
    navigate(link)
  }

  if (!meta) return <Loading />
  const data = meta.data

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notifikasi</h1>
          <p className="text-sm text-gray-500">Pemberitahuan tugas, subtugas, deadline, dan verifikasi.</p>
        </div>
        <button onClick={markAll} className="btn btn-secondary text-xs"><CheckCheck size={16} /> Tandai semua dibaca</button>
      </div>

      {!data?.length ? <EmptyState text="Belum ada notifikasi." /> : (
        <>
          <div className="card divide-y divide-gray-100">
            {data.map((n) => (
              <button
                key={n.id}
                onClick={() => handleOpen(n)}
                className={`w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-brand-100' : ''}`}
              >
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-brand-200 text-brand-700' : 'bg-gray-100 text-gray-400'}`}>
                  <Bell size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.judul}</p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.isi}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-2 shrink-0" />}
              </button>
            ))}
          </div>

          {meta.last_page > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-400">
                Menampilkan {meta.from}–{meta.to} dari {meta.total} notifikasi
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!meta.prev_page_url}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-600">
                  Halaman {meta.current_page} / {meta.last_page}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.next_page_url}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detail Notifikasi">
        {detail && (
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-900">{detail.judul}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(detail.created_at)}</p>
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-line">{detail.isi || 'Tidak ada keterangan tambahan.'}</p>
            <div className="flex gap-2 pt-2">
              {detail.link && (
                <button onClick={handleGoToLink} className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 text-sm flex-1">
                  Buka Halaman Terkait
                </button>
              )}
              <button onClick={() => setDetail(null)} className="btn btn-secondary text-sm">
                <X size={15} /> Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}