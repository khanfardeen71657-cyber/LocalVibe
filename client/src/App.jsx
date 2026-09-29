import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Avatar from './components/Avatar'
import Login from './pages/Login'
import Register from './pages/Register'
import Feed from './pages/Feed'
import Nearby from './pages/Nearby'
import NearbyMap from './pages/NearbyMap'
import Search from './pages/Search'
import CreateEvent from './pages/CreateEvent'
import EventDetail from './pages/EventDetail'
import UserProfile from './pages/UserProfile'

function Nav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const link = (to, label) => (
    <Link to={to} className={pathname === to ? 'active' : ''}>{label}</Link>
  )

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <>
      <nav className="nav">
        <Link to="/" className="brand">LocalVibe</Link>

        {user && (
          <>
            <div className="nav-links nav-links-desktop">
              {link('/', 'Feed')}
              {link('/nearby', 'Nearby')}
              {link('/map', 'Map')}
              {link('/search', 'Find people')}
              {link('/create', '+ Create')}
            </div>

            <div className="nav-user nav-user-desktop">
              <Link to={`/user/${user._id}`} className="nav-avatar-link">
                <Avatar name={user.username} src={user.avatar} size={32} />
              </Link>
              <Link to={`/user/${user._id}`} className="muted nav-username">
                @{user.username}
              </Link>
              <button className="ghost" onClick={handleLogout}>Log out</button>
            </div>

            <div className="nav-mobile">
              <Link to={`/user/${user._id}`} className="nav-avatar-link">
                <Avatar name={user.username} src={user.avatar} size={30} />
              </Link>
              <button
                className={`hamburger ${menuOpen ? 'open' : ''}`}
                onClick={() => setMenuOpen(v => !v)}
                aria-label="Menu"
              >
                <span /><span /><span />
              </button>
            </div>
          </>
        )}
      </nav>

      {user && menuOpen && (
        <>
          <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="mobile-menu">
            <div className="mobile-menu-user">
              <Avatar name={user.username} src={user.avatar} size={44} />
              <div>
                <div className="mobile-menu-username">@{user.username}</div>
                <Link to={`/user/${user._id}`} className="mobile-menu-sub">View profile</Link>
              </div>
            </div>
            <div className="mobile-menu-links">
              {link('/', 'Feed')}
              {link('/nearby', 'Nearby')}
              {link('/map', 'Map')}
              {link('/search', 'Find people')}
              {link('/create', '+ Create event')}
            </div>
            <button className="mobile-menu-logout" onClick={handleLogout}>Log out</button>
          </div>
        </>
      )}
    </>
  )
}

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/" element={<Protected><Feed /></Protected>} />
        <Route path="/nearby" element={<Protected><Nearby /></Protected>} />
        <Route path="/map" element={<Protected><NearbyMap /></Protected>} />
        <Route path="/search" element={<Protected><Search /></Protected>} />
        <Route path="/create" element={<Protected><CreateEvent /></Protected>} />
        <Route path="/events/:id" element={<Protected><EventDetail /></Protected>} />
        <Route path="/user/:id" element={<Protected><UserProfile /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}