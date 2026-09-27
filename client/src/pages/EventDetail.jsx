import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=80'
]

function pickImage(ev) {
  if (ev?.image) return ev.image
  const id = ev?._id || ''
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return HERO_IMAGES[hash % HERO_IMAGES.length]
}

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: 'numeric', minute: '2-digit'
  })
}

function formatAddress(addr) {
  if (!addr) return null
  if (addr.full) return addr.full
  const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

export default function EventDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const data = await api.getEvent(id)
      setEvent(data.event)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, [id])

  if (error && !event) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <Link to="/" className="muted">← Back to feed</Link>
      </div>
    )
  }
  if (!event) return <div className="page"><p className="muted">Loading event…</p></div>

  const isHost = String(event.host?._id) === String(user?._id)
  const isAttending = event.attendees.some(a => String(a._id) === String(user?._id))
  const isInterested = (event.interested || []).some(a => String(a._id) === String(user?._id))
  const spotsLeft = event.total_seats - event.attendees.length
  const addressText = formatAddress(event.address)
  const hasCoords = event.location?.coordinates?.length === 2

  async function join() {
    setBusy(true); setError('')
    try { await api.joinEvent(id); await load() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function interested() {
    setBusy(true); setError('')
    try { await api.interestedEvent(id); await load() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function exit() {
    setBusy(true); setError('')
    try { await api.exitEvent(id); await load() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function remove() {
    if (!window.confirm('Delete this event? This cannot be undone.')) return
    setBusy(true)
    try { await api.deleteEvent(id); navigate('/') }
    catch (err) { setError(err.message); setBusy(false) }
  }

  async function toggleFeature() {
    setBusy(true); setError('')
    try {
      await api.featureEvent(id, !event.isFeatured)
      await load()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="page">
      <Link to="/" className="muted" style={{ display: 'inline-block', marginBottom: '1rem' }}>
        ← Back to feed
      </Link>

      <div className="event-hero" style={{ backgroundImage: `url(${pickImage(event)})` }} />

      <div className="row between" style={{ alignItems: 'flex-start', gap: '2rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ marginBottom: '.5rem' }}>
            {event.name}
            {event.isFeatured && (
              <span className="badge" style={{ marginLeft: 10, background: '#fbbf24', color: '#451a03' }}>
                ★ Featured
              </span>
            )}
          </h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Hosted by{' '}
            <Link to={`/user/${event.host?._id}`} style={{ fontWeight: 600 }}>
              @{event.host?.username || 'unknown'}
            </Link>
          </p>
        </div>

        <div className="row" style={{ flexShrink: 0 }}>
          {event.paid
            ? <span className="badge paid">Paid</span>
            : <span className="badge free">Free</span>}
          {event.status && <span className={`badge ${event.status}`}>{event.status}</span>}
          {event.category && <span className="badge">{event.category}</span>}
        </div>
      </div>

      {event.description && (
        <p style={{
          fontSize: '1.05rem', lineHeight: 1.7, marginTop: '1.5rem',
          color: 'var(--text-2)', whiteSpace: 'pre-wrap'
        }}>
          {event.description}
        </p>
      )}

      <div className="info-row">
        {addressText && <span><span>📍</span> {addressText}</span>}
        {event.startsAt && <span><span>🕒</span> {formatDate(event.startsAt)}</span>}
        {event.endsAt && <span><span>🏁</span> Ends {formatDate(event.endsAt)}</span>}
        <span>
          <span>👥</span> {event.attendees.length} / {event.total_seats} attending
          {spotsLeft > 0 && !isHost && (
            <span style={{ color: 'var(--success)', marginLeft: '.5rem' }}>
              · {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
            </span>
          )}
          {spotsLeft === 0 && (
            <span style={{ color: 'var(--danger)', marginLeft: '.5rem' }}>· Full</span>
          )}
        </span>
        {event.price > 0 && (
          <span><span>💵</span> ₹{event.price}</span>
        )}
        {hasCoords && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${event.location.lat ?? event.location.coordinates[1]},${event.location.lng ?? event.location.coordinates[0]}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 600 }}
          >
            Open in Google Maps →
          </a>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="row" style={{ marginTop: '1.5rem' }}>
        {isHost ? (
          <>
            <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              You're hosting
            </span>
            <button className="secondary" onClick={toggleFeature} disabled={busy}>
              {event.isFeatured ? '★ Unfeature' : '☆ Make featured'}
            </button>
            <button className="danger" onClick={remove} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete event'}
            </button>
          </>
        ) : (
          <>
            {isAttending ? (
              <>
                <span className="badge free">You're going ✓</span>
                <button className="secondary" onClick={exit} disabled={busy}>Exit event</button>
              </>
            ) : spotsLeft === 0 ? (
              <button disabled>Event is full</button>
            ) : (
              <button onClick={join} disabled={busy}>
                {busy ? 'Joining…' : 'Join event'}
              </button>
            )}
            <button
              className={isInterested ? 'secondary' : 'ghost'}
              onClick={interested}
              disabled={busy}
            >
              {isInterested ? '✓ Interested' : 'Interested'}
            </button>
          </>
        )}
      </div>

      <h2>Who's going</h2>
      {event.attendees.length === 0 ? (
        <p className="muted">No attendees yet. Be the first!</p>
      ) : (
        <div className="attendee-list">
          {event.attendees.map(a => (
            <Link to={`/user/${a._id}`} key={a._id} className="attendee">
              <div className="avatar">{a.username.slice(0, 2)}</div>
              <span>@{a.username}</span>
              {String(a._id) === String(event.host?._id) && (
                <span className="badge" style={{ fontSize: '.6rem', padding: '.15rem .5rem' }}>
                  Host
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {(event.interested?.length > 0) && (
        <>
          <h2>Interested</h2>
          <div className="attendee-list">
            {event.interested.map(a => (
              <Link to={`/user/${a._id}`} key={a._id} className="attendee">
                <div className="avatar">{a.username.slice(0, 2)}</div>
                <span>@{a.username}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}