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

    // Browser otomatis reconnect kalau koneksi putus, tidak perlu logic tambahan.

    return () => es.close()
  }, [])
}