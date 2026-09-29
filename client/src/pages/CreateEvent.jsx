import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getCurrentPosition } from '../api'
import AddressAutocomplete from '../components/AddressAutocomplete'

const CATEGORIES = ['music', 'sports', 'food', 'art', 'tech', 'community', 'other']

export default function CreateEvent() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    image: '',
    category: 'other',
    price: 0,
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'India',
    total_seats: 10,
    status: 'offline',
    type: '',
    startsAt: '',
    endsAt: ''
  })
  const [coords, setCoords] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // convert selected file to base64 data URL
  function handleImageFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // size limit: 2 MB
    if (file.size > 2 * 1024 * 1024) {
      setError('Image too large. Please pick a file under 2 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      set('image', ev.target.result)   // base64 data URL
      setError('')
    }
    reader.onerror = () => setError('Could not read that file')
    reader.readAsDataURL(file)
  }

  function clearImage() {
    set('image', '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleAddressSelect(place) {
    setForm(f => ({
      ...f,
      street:  place.street  || f.street,
      city:    place.city    || f.city,
      state:   place.state   || f.state,
      zip:     place.zip     || f.zip,
      country: place.country || f.country
    }))
    setCoords({ lat: Number(place.lat), lng: Number(place.lng) })
  }

  async function useMyLocation() {
    try {
      const pos = await getCurrentPosition()
      setCoords({ lat: Number(pos.lat), lng: Number(pos.lng) })
    } catch {
      setError('Could not get your location')
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')

    if (!coords) {
      setError('Please pick an address or use your current location first')
      return
    }
    if (!form.name.trim()) {
      setError('Event name is required')
      return
    }

    setBusy(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        image: form.image || '',       // base64 data URL or empty
        category: form.category,
        price: Number(form.price) || 0,
        address: {
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zip: form.zip.trim(),
          country: form.country.trim() || 'India'
        },
        lng: Number(coords.lng),
        lat: Number(coords.lat),
        total_seats: Number(form.total_seats) || 1,
        status: form.status,
        type: form.type.trim(),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined
      }

      const data = await api.createEvent(payload)
      navigate(`/events/${data.event._id}`)
    } catch (err) {
      console.error('Create event error:', err)
      setError(err.message || 'Failed to create event')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <h1>Create an event</h1>
      <p className="subtitle">Give it a name, a place, and a time. Then invite your city.</p>

      <form onSubmit={submit}>
        {/* Event name */}
        <div>
          <label>Event name</label>
          <input
            placeholder="Rooftop jazz night"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
          />
        </div>

        {/* Cover image upload */}
        <div>
          <label>Cover image</label>

          {!form.image && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '32px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--surface-2)',
                transition: 'all .12s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                Click to choose an image
              </div>
              <div className="muted" style={{ fontSize: '12px' }}>
                JPG, PNG, WEBP · max 2 MB
              </div>
            </div>
          )}

          {form.image && (
            <div style={{ position: 'relative', marginTop: '4px' }}>
              <div
                className="image-preview"
                style={{
                  backgroundImage: `url(${form.image})`,
                  height: '200px'
                }}
              />
              <button
                type="button"
                onClick={clearImage}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,.75)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: 0,
                  lineHeight: 1
                }}
                title="Remove image"
              >
                ✕
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFile}
            style={{ display: 'none' }}
          />
        </div>

        {/* Description */}
        <div>
          <label>Description</label>
          <textarea
            placeholder="Tell people what to expect…"
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        {/* Address autocomplete */}
        <div>
          <label>Address (autocomplete)</label>
          <AddressAutocomplete onSelect={handleAddressSelect} />
          {coords && (
            <p className="muted" style={{ marginTop: 6 }}>
              ✓ {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Street + City */}
        <div className="row">
          <div style={{ flex: 2 }}>
            <label>Street</label>
            <input value={form.street} onChange={e => set('street', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>City</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} />
          </div>
        </div>

        {/* State + PIN + Country */}
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>State</label>
            <input value={form.state} onChange={e => set('state', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>PIN</label>
            <input value={form.zip} onChange={e => set('zip', e.target.value)} />
          </div>
          <div style={{ flex: 2 }}>
            <label>Country</label>
            <input value={form.country} onChange={e => set('country', e.target.value)} />
          </div>
        </div>

        {/* Use current location */}
        <div>
          <label>Or use current location</label>
          <button type="button" className="secondary" onClick={useMyLocation}>
            {coords
              ? `✓ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
              : 'Use my current location'}
          </button>
        </div>

        {/* Category + Price + Seats */}
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Price (₹)</label>
            <input type="number" min="0" value={form.price}
              onChange={e => set('price', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Total seats</label>
            <input type="number" min="1" value={form.total_seats}
              onChange={e => set('total_seats', e.target.value)} />
          </div>
        </div>

        {/* Status + Type */}
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Type (optional)</label>
            <input placeholder="music, sports…" value={form.type}
              onChange={e => set('type', e.target.value)} />
          </div>
        </div>

        {/* Starts + Ends */}
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Starts</label>
            <input type="datetime-local" value={form.startsAt}
              onChange={e => set('startsAt', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Ends</label>
            <input type="datetime-local" value={form.endsAt}
              onChange={e => set('endsAt', e.target.value)} />
          </div>
        </div>

        {/* Error */}
        {error && <p className="error">{error}</p>}

        {/* Submit */}
        <button disabled={busy} style={{ marginTop: '.5rem' }}>
          {busy ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </div>
  )
}