import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getCurrentPosition } from '../api'

const FALLBACKS = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80'
]

function pickImage(ev) {
  if (ev?.image) return ev.image
  const id = ev?._id || ''
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACKS[hash % FALLBACKS.length]
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

function EventCard({ ev }) {
  const addressText = formatAddress(ev.address)
  return (
    <Link to={`/events/${ev._id}`} className="card">
      <div className="card-image" style={{ backgroundImage: `url(${pickImage(ev)})` }}>
        {ev.paid
          ? <span className="badge paid alert">Paid</span>
          : <span className="badge free alert">Free</span>}
        {ev.isFeatured && (
          <span className="badge alert" style={{ left: 'auto', right: 12, background: '#fbbf24', color: '#451a03' }}>
            ★ Featured
          </span>
        )}
      </div>
      <div className="card-body">
        <h3>{ev.name}</h3>
        {ev.message && <div className="card-friends">{ev.message}</div>}
        {addressText && (
          <div className="card-meta"><span>📍</span><span>{addressText}</span></div>
        )}
        {ev.startsAt && (
          <div className="card-meta"><span>🕒</span><span>{formatDate(ev.startsAt)}</span></div>
        )}
        {ev.attendeeCount != null && (
          <div className="card-meta">
            <span>👥</span>
            <span>{ev.attendeeCount} {ev.attendeeCount === 1 ? 'person' : 'people'} going</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default function Feed() {
  const [feed, setFeed] = useState([])
  const [recommended, setRecommended] = useState([])
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.feed()
      .then(d => setFeed(d.feed))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

    getCurrentPosition()
      .then(pos => api.recommended(pos.lng, pos.lat))
      .then(d => {
        setRecommended(d.events || [])
        setReason(d.reason || '')
      })
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="page">
        <h1>Your feed</h1>
        <p className="subtitle">Loading what your people are up to…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Your feed</h1>
      <p className="subtitle">
        A live look at what the people you follow are joining around the city.
      </p>

      {error && <p className="error">{error}</p>}

      {!error && feed.length === 0 && (
        <div className="empty">
          <div className="empty-icon">✨</div>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-2)', marginBottom: '.5rem' }}>
            Your feed is quiet
          </p>
          <p className="muted">
            <Link to="/search">Follow people</Link> to see what they're up to.
          </p>
        </div>
      )}

      {feed.length > 0 && (
        <div className="grid">
          {feed.map(ev => <EventCard key={ev._id} ev={ev} />)}
        </div>
      )}

      {recommended.length > 0 && (
        <>
          <h2>Recommended for you</h2>
          {reason && <p className="muted" style={{ marginBottom: 12 }}>{reason}</p>}
          <div className="grid">
            {recommended.map(ev => <EventCard key={ev._id} ev={ev} />)}
          </div>
        </>
      )}
    </div>
  )
}