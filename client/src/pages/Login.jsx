import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-centered">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand">LocalVibe</span>
        </div>

        <div className="auth-head">
          <h1>Welcome back</h1>
          <p className="subtitle">Log in to see what's happening near you.</p>
        </div>

        <form onSubmit={submit}>
          <div>
            <label>Username</label>
            <input
              placeholder="demo"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button disabled={busy} className="auth-submit">
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="auth-hint">
          <p className="muted">
            Try the demo account: <strong>demo</strong> / <strong>demo1234</strong>
          </p>
        </div>

        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>

      <p className="auth-footer">
        © {new Date().getFullYear()} LocalVibe · Built for your neighborhood
      </p>
    </div>
  )
}