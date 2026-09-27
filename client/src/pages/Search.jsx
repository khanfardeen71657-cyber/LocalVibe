import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import Avatar from '../components/Avatar'

export default function Search() {
  const { user: me, refreshUser } = useAuth()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [following, setFollowing] = useState(new Set())

  async function doSearch(e) {
    e?.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await api.searchUsers(q.trim())
      setResults(data.users)
      const myData = await api.me()
      setFollowing(new Set(myData.user.following.map(u => u._id)))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleFollow(username, id) {
    try {
      const isFollowing = following.has(id)
      if (isFollowing) {
        await api.unfollow(username)
        setFollowing(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      } else {
        await api.follow(username)
        setFollowing(prev => new Set(prev).add(id))
      }
      await refreshUser()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page narrow">
      <h1>Find people</h1>
      <p className="subtitle">
        Search by username and follow to see what they're discovering.
      </p>

      <form className="searchbar" onSubmit={doSearch}>
        <input
          placeholder="Search username…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button disabled={loading}>{loading ? '…' : 'Search'}</button>
      </form>

      {error && <p className="error">{error}</p>}

      {!loading && q && results.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🔎</div>
          <p>No users found for "{q}".</p>
        </div>
      )}

      <div className="user-list">
        {results.map(u => {
          const isMe = me && String(me._id) === String(u._id)
          const isFollowing = following.has(u._id)
          return (
            <div key={u._id} className="user-row">
              <Link to={`/user/${u._id}`} className="user-row-link">
                <Avatar name={u.username} src={u.avatar} size={44} />
                <div className="user-row-info">
                  <div className="user-row-name">
                    @{u.username}
                    {isMe && <span className="you-tag">You</span>}
                  </div>
                  <div className="user-row-sub">
                    {isMe ? 'This is you' : 'View profile'}
                  </div>
                </div>
              </Link>

              {isMe ? (
                <Link to={`/user/${u._id}`} className="secondary-btn">
                  View my profile
                </Link>
              ) : (
                <button
                  className={isFollowing ? 'secondary' : ''}
                  onClick={() => toggleFollow(u.username, u._id)}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}