export default function SpeedometerGauge({ value = 0, size = 160, label }) {
  const percent = Math.min(100, Math.max(0, value)) / 100
  const r = size / 2 - 16
  const cx = size / 2
  const cy = size / 2
  const strokeW = 12

  const pointFor = (p, radius = r) => {
    const angle = p * Math.PI - Math.PI
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
  }

  const start = pointFor(0)
  const fullEnd = pointFor(1)
  const progressEnd = pointFor(percent)
  const needleTip = pointFor(percent, r - 6) // jarum sedikit lebih pendek dari arc

  const status =
    percent >= 0.75 ? 'success' : percent >= 0.4 ? 'warning' : 'danger'

  const colors = {
    success: { main: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    warning: { main: '#f59e0b', text: 'text-amber-600', bg: 'bg-amber-50' },
    danger: { main: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' },
  }[status]

  const gradId = `gauge-grad-${size}-${label || 'x'}`
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size / 2 + 20}
        viewBox={`0 0 ${size} ${size / 2 + 20}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* track dasar redup */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${fullEnd.x} ${fullEnd.y}`}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* referensi zona warna, tipis */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${fullEnd.x} ${fullEnd.y}`}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeW}
          strokeLinecap="round"
          opacity={0.18}
        />

        {/* isi progress solid */}
        {percent > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${progressEnd.x} ${progressEnd.y}`}
            fill="none"
            stroke={colors.main}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}

        {/* tick marks */}
        {ticks.map((t) => {
          const inner = pointFor(t, r - strokeW / 2 - 4)
          const outer = pointFor(t, r + strokeW / 2 + 4)
          return (
            <line
              key={t}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          )
        })}

        {/* jarum — digambar terakhir supaya di atas semua elemen lain */}
        <line
          x1={cx} y1={cy}
          x2={needleTip.x} y2={needleTip.y}
          stroke="#1e293b"
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={7} fill="#1e293b" />
        <circle cx={cx} cy={cy} r={3} fill="#fff" />
      </svg>

      <div className={`mt-1 px-3 py-1 rounded-full ${colors.bg}`}>
        <span className={`text-lg font-bold ${colors.text}`}>{Math.round(value)}%</span>
      </div>
      {label && <span className="text-xs text-gray-400 mt-0.5">{label}</span>}
    </div>
  )
}