import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { api, getCurrentPosition } from '../api'

const IMAGES = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=600&q=80'
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

// custom map icons — green for normal, orange+bigger for featured
const normalIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:26px; height:26px; border-radius:50%;
    background:#16a34a; border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,.3);
  "></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
})

const featuredIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:38px; height:38px; border-radius:50%;
    background:#f59e0b; border:4px solid #fff;
    box-shadow:0 4px 12px rgba(0,0,0,.4);
    display:flex; align-items:center; justify-content:center;
    color:#fff; font-weight:bold; font-size:16px;
  ">★</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19]
})

const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px; height:18px; border-radius:50%;
    background:#4f46e5; border:3px solid #fff;
    box-shadow:0 0 0 4px rgba(79,70,229,.3);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
})

// recenters map when userLocation updates
function Recenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

const CATEGORIES = ['all', 'music', 'sports', 'food', 'art', 'tech', 'community', 'other']

export default function NearbyMap() {
  const [userLocation, setUserLocation] = useState(null)
  const [events, setEvents] = useState([])
  const [radius, setRadius] = useState(5000)
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(r = radius) {
    setLoading(true)
    setError('')
    try {
      const pos = userLocation || await getCurrentPosition()
      setUserLocation(pos)
      const data = await api.nearby(pos.lng, pos.lat, { radius: r, category })
      setEvents(data.events)
    } catch (err) {
      setError(err.message || 'Could not load nearby events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [category])

  const pills = [
    { label: '1 km', value: 1000 },
    { label: '2 km', value: 2000 },
    { label: '5 km', value: 5000 },
    { label: '10 km', value: 10000 }
  ]

  // Leaflet expects [lat, lng]
  const center = userLocation ? [userLocation.lat, userLocation.lng] : [19.0760, 72.8777]

  return (
    <div className="page">
      <h1>Events near you</h1>
      <p className="subtitle">
        {userLocation
          ? `Live events within ${radius / 1000} km of where you are right now.`
          : 'Locating you to find events happening around you…'}
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

      {error && <p className="error">{error}</p>}

      <div className="map-wrap">
        <MapContainer
          center={center}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Recenter center={center} />

          {userLocation && (
            <>
              <Marker position={center} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
              <Circle
                center={center}
                radius={radius}
                pathOptions={{
                  color: '#4f46e5',
                  weight: 2,
                  fillColor: '#4f46e5',
                  fillOpacity: 0.08
                }}
              />
            </>
          )}

          {events.map(ev => {
            const coords = ev.location?.coordinates
            if (!coords) return null
            const position = [coords[1], coords[0]]
            const icon = ev.isFeatured ? featuredIcon : normalIcon
            return (
              <Marker key={ev._id} position={position} icon={icon}>
                <Popup>
                  <div style={{ minWidth: 220, fontFamily: 'inherit' }}>
                    <div
                      style={{
                        height: 100,
                        borderRadius: 8,
                        backgroundImage: `url(${pickImage(ev)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        marginBottom: 8
                      }}
                    />
                    <strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                      {ev.name}
                    </strong>
                    {formatAddress(ev.address) && (
                      <div style={{ fontSize: 12, color: '#52525b', marginBottom: 4 }}>
                        📍 {formatAddress(ev.address)}
                      </div>
                    )}
                    {ev.startsAt && (
                      <div style={{ fontSize: 12, color: '#52525b', marginBottom: 8 }}>
                        🕒 {formatDate(ev.startsAt)}
                      </div>
                    )}
                    <Link
                      to={`/events/${ev._id}`}
                      style={{ fontSize: 13, color: '#4f46e5', fontWeight: 600 }}
                    >
                      View event →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      <h2>List of events nearby</h2>
      {loading && <p className="muted">Loading events…</p>}
      {!loading && events.length === 0 && !error && (
        <div className="empty">
          <div className="empty-icon">🗺️</div>
          <p>No events match your filters.</p>
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