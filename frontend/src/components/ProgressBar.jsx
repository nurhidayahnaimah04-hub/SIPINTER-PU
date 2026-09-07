export default function ProgressBar({ value = 0, className = '' }) {
  const v = Math.min(100, Math.max(0, value))
  const color = v >= 100 ? 'bg-emerald-500' : v >= 50 ? 'bg-brand-500' : 'bg-amber-500'
  return (
    <div className={`w-full bg-gray-100 rounded-full h-2 ${className}`}>
      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${v}%` }} />
    </div>
  )
}
