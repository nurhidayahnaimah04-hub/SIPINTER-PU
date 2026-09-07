import { useEffect, useRef } from 'react'

/**
 * Menjalankan `fetchFn` segera, lalu mengulanginya secara berkala serta setiap kali
 * tab/browser kembali fokus (visibilitychange/focus) sehingga data yang ditampilkan
 * selalu sinkron dengan database tanpa perlu reload manual oleh user.
 *
 * @param {Function} fetchFn - fungsi (boleh async) yang mengambil data terbaru.
 * @param {Array} deps - dependency yang bila berubah akan memicu ulang seluruh siklus polling.
 * @param {number} intervalMs - jeda polling (default 15 detik).
 */
export function useAutoRefresh(fetchFn, deps = [], intervalMs = 15000) {
  const fetchRef = useRef(fetchFn)
  fetchRef.current = fetchFn

  useEffect(() => {
    let disposed = false

    function run() {
      if (disposed) return
      try {
        fetchRef.current()
      } catch (e) {
        // biarkan komponen pemanggil yang menangani error di dalam fetchFn-nya sendiri
      }
    }

    run()
    const interval = setInterval(run, intervalMs)

    function onVisible() {
      if (document.visibilityState === 'visible') run()
    }

    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disposed = true
      clearInterval(interval)
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export default useAutoRefresh
