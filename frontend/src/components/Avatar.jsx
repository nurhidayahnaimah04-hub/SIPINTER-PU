const palette = [
  'bg-pupr-blue text-white',
  'bg-pupr-yellow text-pupr-blue-dark',
  'bg-pupr-blue-light text-white',
  'bg-gray-700 text-white',
]

function hashName(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}

export default function Avatar({ name, size = 'sm' }) {
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const colorClass = palette[hashName(name) % palette.length]
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'

  return (
    <span
      title={name}
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 ${sizeClass} ${colorClass}`}
    >
      {initials}
    </span>
  )
}
