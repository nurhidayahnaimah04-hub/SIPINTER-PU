const config = {
  belum_mulai: { color: 'bg-gray-300', label: 'Belum mulai', text: 'text-gray-500' },
  proses: { color: 'bg-pupr-blue-light', label: 'Proses', text: 'text-pupr-blue' },
  selesai: { color: 'bg-pupr-yellow', label: 'Selesai', text: 'text-pupr-yellow-dark' },
}

export default function StatusDot({ status }) {
  const c = config[status] || config.belum_mulai
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
      <span className={`w-1.5 h-1.5 rounded-full ${c.color}`} />
      <span className={c.text}>{c.label}</span>
    </span>
  )
}
