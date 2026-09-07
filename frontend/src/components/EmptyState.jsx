export default function EmptyState({ text = 'Belum ada data.' }) {
  return <div className="text-center py-12 text-gray-400 text-sm">{text}</div>
}
