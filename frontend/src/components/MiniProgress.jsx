export default function MiniProgress({ value = 0 }) {
  const barColor =
    value >= 100 ? 'bg-pupr-yellow' : value > 0 ? 'bg-pupr-blue-light' : 'bg-gray-200'

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden min-w-[60px]">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-500 w-9 text-right shrink-0">{value}%</span>
    </div>
  )
}
