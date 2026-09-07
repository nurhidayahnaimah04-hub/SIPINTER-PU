// Menyimpan koneksi SSE aktif per user_id, supaya notifikasi baru bisa langsung
// "didorong" ke browser tanpa polling. Catatan: ini disimpan di memori proses
// Node saat ini -- kalau nanti deploy multi-instance/cluster, tiap instance
// hanya tahu koneksi miliknya sendiri (cukup untuk deployment single-instance).
const clients = new Map(); // user_id -> Set<res>

export function subscribe(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
}

export function unsubscribe(userId, res) {
  clients.get(userId)?.delete(res);
}

export function push(userId, notification) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;
  const payload = `data: ${JSON.stringify(notification)}\n\n`;
  for (const res of set) {
    res.write(payload);
  }
}