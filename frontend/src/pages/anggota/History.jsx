import { useState } from 'react'
import api from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { usePeriode } from '../../context/PeriodeContext'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import { formatDate, statusBadgeClass } from '../../lib/helpers'
import { periodeLabel } from '../../lib/periode'
import { Link } from 'react-router-dom'

export default function History() {
  const { periode } = usePeriode()
  const [items, setItems] = useState(null)

  useAutoRefresh(() => {
    api.get('/subtugas', { params: periode }).then((res) => setItems(res.data))
  }, [periode.periode_id, periode.semester])

  if (!items) return <Loading />

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Riwayat Pekerjaan</h1>
      <p className="text-sm text-gray-500 mb-6">{periodeLabel(periode)} — ganti periode di atas untuk melihat semester/tahun lain.</p>

      {!items.length ? <EmptyState text="Tidak ada riwayat pada periode ini." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Subtugas</th>
                <th className="px-4 py-3 font-medium">Tugas</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><Link to={`/anggota/subtugas/${t.id}`} className="text-brand-600 hover:underline font-medium">{t.judul}</Link></td>
                  <td className="px-4 py-3 text-gray-600">{t.tugas?.judul}</td>
                  <td className="px-4 py-3 text-gray-600">{t.progress}%</td>
                  <td className="px-4 py-3"><span className={statusBadgeClass(t.status)}>{t.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{t.deadline ? formatDate(t.deadline) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
