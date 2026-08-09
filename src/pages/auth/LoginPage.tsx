import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useBusinessStore } from '@/stores/businessStore'
import { db } from '@/database/dexie'
import { generateId, getDeviceId } from '@/utils/deviceId'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setSession } = useAuthStore()
  const { setActiveBusiness } = useBusinessStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!isSupabaseConfigured) {
      // Demo mode — bypass auth
      const fakeUser = { id: 'demo-user-' + Date.now(), email }
      useAuthStore.setState({ user: fakeUser as never, isLoading: false })
      const businesses = await db.businesses.where('owner_id').equals('demo').toArray()
      if (businesses.length > 0) {
        setActiveBusiness(businesses[0])
        navigate('/dashboard')
      } else {
        navigate('/onboarding')
      }
      setLoading(false)
      return
    }

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setSession(data.session)
    const businesses = await db.businesses.where('owner_id').equals(data.user.id).toArray()
    if (businesses.length > 0) navigate('/dashboard')
    else navigate('/onboarding')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'var(--surface-3)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0052CC 0%, #0066FF 60%, #3399FF 100%)',
        padding: '3rem 1.5rem 4rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -20,
          width: 150, height: 150, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 900, fontSize: '1.5rem',
          marginBottom: '1.25rem',
          border: '1.5px solid rgba(255,255,255,0.3)',
        }}>Z</div>
        <h1 style={{ color: 'white', marginBottom: '0.375rem' }}>Welcome back</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem' }}>
          Sign in to your Zentra account
        </p>
      </div>

      {/* Form */}
      <div style={{
        flex: 1, padding: '0 1.25rem',
        marginTop: '-1.5rem',
      }}>
        <div className="card" style={{ borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          {!isSupabaseConfigured && (
            <div style={{
              background: 'var(--warning-light)', border: '1px solid var(--warning)',
              borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem',
              fontSize: '0.875rem', color: '#92400E',
            }}>
              ⚠️ <strong>Demo Mode</strong> — Supabase not configured. Data saved locally only.
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            {error && (
              <div style={{
                background: 'var(--danger-light)', border: '1px solid var(--danger)',
                borderRadius: 10, padding: '0.75rem 1rem',
                color: 'var(--danger)', fontSize: '0.875rem',
              }}>{error}</div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="email">Email address</label>
              <input id="email" type="email" className="input" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input id="password" type={showPw ? 'text' : 'password'} className="input"
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  style={{ paddingRight: '3rem' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="divider-text" style={{ margin: '1.25rem 0' }}>or</div>

          <Link to="/auth/register" className="btn btn-secondary btn-full" style={{ textDecoration: 'none' }}>
            Create a new account
          </Link>

          {!isSupabaseConfigured && (
            <button
              onClick={() => {
                useAuthStore.setState({ user: { id: 'demo', email: 'demo@zentra.app' } as never, isLoading: false })
                navigate('/onboarding')
              }}
              className="btn btn-ghost btn-full"
              style={{ marginTop: '0.5rem' }}
            >
              ✨ Try Demo (no account needed)
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
          Your data is saved on this device even without internet.
        </p>
      </div>
    </div>
  )
}
