import { useEffect, useRef } from 'react'

export function useNotificationStream(onNotification) {
  const handlerRef = useRef(onNotification)
  handlerRef.current = onNotification

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const base = import.meta.env.VITE_API_URL || '/api'
    const es = new EventSource(`${base}/notifications/stream?token=${encodeURIComponent(token)}`)

    es.onmessage = (e) => {
      try {
        const notif = JSON.parse(e.data)
        handlerRef.current?.(notif)
      } catch {
        // abaikan pesan yang bukan JSON notifikasi (mis. komentar ": ping")
      }
    }

    es.onerror = (err) => {
      // Jika server mengembalikan HTML (404/500/401), tutup eventSource agar tidak spam reconnect
      if (es.readyState === EventSource.CLOSED || es.readyState === EventSource.CONNECTING) {
        // Tutup koneksi secara aman jika error response bertipe non-event-stream
        es.close()
      }
    }

    return () => es.close()
  }, [])
}