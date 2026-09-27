import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getCurrentPosition } from '../api'

const IMAGES = [
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80'
]

function pickImage(ev) {
  if (ev?.image) return ev.image
  const id = ev?._id || ''
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return IMAGES[hash % IMAGES.length]
}

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })
}

function formatAddress(addr) {
  if (!addr) return null
  if (addr.full) return addr.full
  const parts = [addr.street, addr.city, addr.state].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

const CATEGORIES = ['all', 'music', 'sports', 'food', 'art', 'tech', 'community', 'other']

export default function Nearby() {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [radius, setRadius] = useState(5000)
  const [coords, setCoords] = useState(null)
  const [category, setCategory] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  function dateRange() {
    const now = new Date()
    const start = new Date(now)
    const end = new Date(now)
    if (dateFilter === 'today') {
      end.setHours(23, 59, 59, 999)
    } else if (dateFilter === 'week') {
      end.setDate(end.getDate() + 7)
    } else if (dateFilter === 'month') {
      end.setMonth(end.getMonth() + 1)
    } else {
      return {}
    }
    return { from: start.toISOString(), to: end.toISOString() }
  }

  async function load(r = radius) {
    setLoading(true)
    setError('')

    let pos
    try {
      pos = coords || await getCurrentPosition()
      setCoords(pos)
    } catch (geoErr) {
      setError('Location permission needed. Allow location access and refresh.')
      setLoading(false)
      return
    }

    try {
      const data = await api.nearby(pos.lng, pos.lat, {
        radius: r,
        category,
        ...dateRange()
      })
      setEvents(data.events || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [category, dateFilter])

  const pills = [
    { label: '1 km', value: 1000 },
    { label: '5 km', value: 5000 },
    { label: '50 km', value: 50000 },
    { label: '500 km', value: 500000 }
  ]

  return (
    <div className="page">
      <h1>Events near you</h1>
      <p className="subtitle">
        {coords
          ? `Events within ${radius / 1000} km of ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}.`
          : 'Getting your location to show what’s nearby…'}
      </p>

      <div className="pills">
        {pills.map(p => (
          <button
            key={p.value}
            className={`pill ${radius === p.value ? 'active' : ''}`}
            onClick={() => { setRadius(p.value); load(p.value) }}
          >
            {p.label}
          </button>
        ))}
        <button className="pill" onClick={() => load()}>Refresh</button>
      </div>

      <div className="pills" style={{ marginTop: 8 }}>
        {CATEGORIES.map(c => (
          <button
            key={c}
            className={`pill ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="pills" style={{ marginTop: 8 }}>
        {[
          { key: 'all', label: 'Any time' },
          { key: 'today', label: 'Today' },
          { key: 'week', label: 'This week' },
          { key: 'month', label: 'This month' }
        ].map(d => (
          <button
            key={d.key}
            className={`pill ${dateFilter === d.key ? 'active' : ''}`}
            onClick={() => setDateFilter(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {loading && <p className="muted" style={{ marginTop: '1.5rem' }}>Finding events…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && events.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🗺️</div>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-2)', marginBottom: '.5rem' }}>
            No events match your filters
          </p>
          <p className="muted">
            <Link to="/create">Create one</Link> and put your area on the map.
          </p>
        </div>
      )}

      <div className="grid">
        {events.map(ev => {
          const addressText = formatAddress(ev.address)
          return (
            <Link to={`/events/${ev._id}`} key={ev._id} className="card">
              <div className="card-image" style={{ backgroundImage: `url(${pickImage(ev)})` }}>
                {ev.distanceMeters != null && (
                  <span className="badge alert">
                    {(ev.distanceMeters / 1000).toFixed(1)} km
                  </span>
                )}
                {ev.isFeatured && (
                  <span
                    className="badge alert"
                    style={{ left: 'auto', right: 12, background: '#fbbf24', color: '#451a03' }}
                  >
                    ★ Featured
                  </span>
                )}
              </div>
              <div className="card-body">
                <h3>{ev.name}</h3>
                {addressText && (
                  <div className="card-meta"><span>📍</span><span>{addressText}</span></div>
                )}
                {ev.startsAt && (
                  <div className="card-meta"><span>🕒</span><span>{formatDate(ev.startsAt)}</span></div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}