const GRADIENTS = [
  'linear-gradient(135deg, #7c5cff, #4f46e5)',
  'linear-gradient(135deg, #f472b6, #be185d)',
  'linear-gradient(135deg, #60a5fa, #1e40af)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #fbbf24, #d97706)',
  'linear-gradient(135deg, #fb7185, #be123c)',
  'linear-gradient(135deg, #a78bfa, #6d28d9)',
  'linear-gradient(135deg, #22d3ee, #0891b2)',
]

function hashString(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export default function Avatar({ name = '', src, size = 36, className = '' }) {
  const initials = name.trim().slice(0, 2).toUpperCase() || '?'
  const gradient = GRADIENTS[hashString(name) % GRADIENTS.length]

  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.36),
    flexShrink: 0,
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`avatar-img ${className}`}
        style={{ ...style, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  return (
    <span
      className={`avatar ${className}`}
      style={{ ...style, background: gradient }}
    >
      {initials}
    </span>
  )
}