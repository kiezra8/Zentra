import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setSession } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!isSupabaseConfigured) {
      useAuthStore.setState({
        user: { id: 'demo-' + Date.now(), email, user_metadata: { name } } as never,
        isLoading: false,
      })
      navigate('/onboarding')
      setLoading(false)
      return
    }

    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } },
    })
    if (err) { setError(err.message); setLoading(false); return }
    setSession(data.session)
    navigate('/onboarding')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-3)' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0052CC 0%, #0066FF 60%, #3399FF 100%)',
        padding: '3rem 1.5rem 4rem', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.5rem', marginBottom: '1.25rem', border: '1.5px solid rgba(255,255,255,0.3)' }}>Z</div>
        <h1 style={{ color: 'white', marginBottom: '0.375rem' }}>Create account</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem' }}>Start managing your business today</p>
      </div>

      <div style={{ flex: 1, padding: '0 1.25rem', marginTop: '-1.5rem' }}>
        <div className="card" style={{ borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            {error && (
              <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 10, padding: '0.75rem 1rem', color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</div>
            )}
            <div className="input-group">
              <label className="input-label" htmlFor="reg-name">Full name</label>
              <input id="reg-name" type="text" className="input" placeholder="Your name"
                value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="reg-email">Email address</label>
              <input id="reg-email" type="email" className="input" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="reg-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input id="reg-password" type={showPw ? 'text' : 'password'} className="input"
                  placeholder="Min. 8 characters" value={password}
                  onChange={e => setPassword(e.target.value)}
                  required minLength={8} style={{ paddingRight: '3rem' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <Loader2 size={20} /> : 'Create Account'}
            </button>
          </form>
          <div className="divider-text" style={{ margin: '1.25rem 0' }}>already have an account?</div>
          <Link to="/auth/login" className="btn btn-secondary btn-full" style={{ textDecoration: 'none' }}>Sign In</Link>
        </div>
      </div>
    </div>
  )
}
