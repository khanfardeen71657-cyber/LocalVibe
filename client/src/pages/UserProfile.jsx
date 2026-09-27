import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import Avatar from '../components/Avatar'

const IMAGES = [
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
  return IMAGES[hash % IMAGES.length]
}

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
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
        {addressText && (
          <div className="card-meta"><span>📍</span><span>{addressText}</span></div>
        )}
        {ev.startsAt && (
          <div className="card-meta"><span>🕒</span><span>{formatDate(ev.startsAt)}</span></div>
        )}
      </div>
    </Link>
  )
}

export default function UserProfile() {
  const { id } = useParams()
  const { user: me, refreshUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isMe = me && String(me._id) === String(id)
  const isFollowing = me?.following?.some(u => String(u._id) === String(id))

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await api.user(id)
      setProfile(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function toggleFollow() {
    if (!profile) return
    setBusy(true)
    try {
      if (isFollowing) {
        await api.unfollow(profile.username)
      } else {
        await api.follow(profile.username)
      }
      await refreshUser()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page"><p className="muted">Loading profile…</p></div>
  if (error) return <div className="page"><p className="error">{error}</p></div>
  if (!profile) return <div className="page"><p className="muted">User not found.</p></div>

  return (
    <div className="page">
      <div className="profile-header">
        <Avatar name={profile.username} src={profile.avatar} size={72} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>
            @{profile.username}
            {isMe && <span className="you-tag">You</span>}
          </h1>
          <div className="profile-stats">
            <span><strong>{profile.followers.length}</strong>followers</span>
            <span><strong>{profile.following.length}</strong>following</span>
            <span><strong>{profile.eventsHosted.length}</strong>hosted</span>
            <span><strong>{profile.eventsJoined.length}</strong>joined</span>
          </div>
          {isMe && (
            <p className="muted" style={{ marginTop: 8 }}>
              This is your profile. Your hosted and joined events appear below.
            </p>
          )}
        </div>

        {!isMe && (
          <div className="profile-actions">
            <button
              className={isFollowing ? 'secondary' : ''}
              onClick={toggleFollow}
              disabled={busy}
            >
              {busy ? '…' : isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          </div>
        )}
      </div>

      <h2 style={{ marginTop: '1rem' }}>Hosted events</h2>
      {profile.eventsHosted.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎤</div>
          <p>No hosted events yet.</p>
        </div>
      ) : (
        <div className="grid">
          {profile.eventsHosted.map(ev => <EventCard key={ev._id} ev={ev} />)}
        </div>
      )}

      <h2>Joined events</h2>
      {profile.eventsJoined.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎟️</div>
          <p>No joined events yet.</p>
        </div>
      ) : (
        <div className="grid">
          {profile.eventsJoined.map(ev => <EventCard key={ev._id} ev={ev} />)}
        </div>
      )}
    </div>
  )
}