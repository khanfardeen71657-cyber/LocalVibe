import { useEffect, useRef, useState } from 'react'

const NOMINATIM = 'https://nominatim.openstreetmap.org'

export default function AddressAutocomplete({ onSelect, placeholder = 'Start typing an address…' }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim() || q.length < 3) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const url = `${NOMINATIM}/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
        const data = await res.json()
        setResults(data)
        setOpen(true)
      } catch (e) {
        console.error(e)
        setError('Address lookup failed')
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => debounceRef.current && clearTimeout(debounceRef.current)
  }, [q])

  function pick(place) {
    const a = place.address || {}
    onSelect({
      street:  [a.house_number, a.road].filter(Boolean).join(' ') || place.display_name?.split(',')[0] || '',
      city:    a.city || a.town || a.village || a.suburb || a.county || '',
      state:   a.state || '',
      zip:     a.postcode || '',
      country: a.country || 'India',
      lat:     parseFloat(place.lat),
      lng:     parseFloat(place.lon),
      full:    place.display_name
    })
    setQ(place.display_name)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />

      {loading && <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>Searching…</p>}
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}

      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            zIndex: 100, maxHeight: 280, overflowY: 'auto'
          }}
        >
          {results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              onClick={() => pick(r)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', background: 'transparent', border: 'none',
                borderBottom: '1px solid var(--border)', color: 'var(--text)',
                cursor: 'pointer', fontSize: 13.5, fontWeight: 400, lineHeight: 1.4
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
