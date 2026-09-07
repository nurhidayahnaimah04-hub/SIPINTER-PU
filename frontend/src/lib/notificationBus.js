// Event kecil di window supaya begitu notifikasi ditandai dibaca di halaman
// Notifikasi, badge unread di sidebar (DashboardLayout) langsung ikut update
// tanpa menunggu siklus polling berikutnya.
const EVENT_NAME = 'sipinter:notifications-changed'

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function onNotificationsChanged(handler) {
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}
