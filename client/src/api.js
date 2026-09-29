const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  register: (payload) => request('/register', { method: 'POST', body: payload, auth: false }),
  login:    (payload) => request('/login',    { method: 'POST', body: payload, auth: false }),
  me:       ()        => request('/me'),
  updateMe: (payload) => request('/me', { method: 'PATCH', body: payload }),
  user:     (id)      => request(`/user/${id}`, { auth: false }),

  searchUsers: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),

  follow:   (userToFollow)   => request('/follow',   { method: 'POST', body: { userToFollow } }),
  unfollow: (userToUnfollow) => request('/unfollow', { method: 'POST', body: { userToUnfollow } }),

  createEvent: (payload) => request('/events', { method: 'POST', body: payload }),
  getEvent:    (id)      => request(`/events/${id}`, { auth: false }),
  updateEvent: (id, payload) => request(`/events/${id}`, { method: 'PATCH', body: payload }),
  deleteEvent: (id)      => request(`/events/${id}`, { method: 'DELETE' }),
  featureEvent:(id, isFeatured) => request(`/events/${id}/feature`, { method: 'PATCH', body: { isFeatured } }),
  joinEvent:   (id)      => request(`/events/${id}/join`, { method: 'POST' }),
  interestedEvent: (id)  => request(`/events/${id}/interested`, { method: 'POST' }),
  exitEvent:   (id)      => request(`/events/${id}/exit`, { method: 'POST' }),

  nearby: (lng, lat, opts = {}) => {
    const p = new URLSearchParams({ lng, lat, radius: opts.radius ?? 5000 })
    if (opts.category && opts.category !== 'all') p.set('category', opts.category)
    if (opts.from) p.set('from', opts.from)
    if (opts.to)   p.set('to', opts.to)
    if (opts.featured) p.set('featured', 'true')
    return request(`/events/nearby?${p.toString()}`)
  },

  recommended: (lng, lat, radius = 20000) =>
    request(`/events/recommended?lng=${lng}&lat=${lat}&radius=${radius}`),

  feed:       () => request('/feed'),
  feedNearby: (lng, lat, radius = 5000) => request(`/feed/nearby?lng=${lng}&lat=${lat}&radius=${radius}`)
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}