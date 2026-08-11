import { useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { db } from '@/database/dexie'
import type { Session } from '@supabase/supabase-js'

async function saveSessionToDexie(session: Session) {
  try {
    await db.authSessions.put({
      id: 'current',
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600 * 1000,
      user_id: session.user.id,
      email: session.user.email ?? '',
    })
  } catch {
    // Non-critical — ignore storage errors
  }
}

async function clearSessionFromDexie() {
  try {
    await db.authSessions.delete('current')
  } catch { /* ignore */ }
}

async function restoreSessionFromDexie(): Promise<Session | null> {
  try {
    const saved = await db.authSessions.get('current')
    if (!saved) return null
    if (saved.expires_at < Date.now()) {
      await clearSessionFromDexie()
      return null
    }
    return {
      access_token: saved.access_token,
      refresh_token: saved.refresh_token,
      token_type: 'bearer',
      expires_in: Math.floor((saved.expires_at - Date.now()) / 1000),
      expires_at: Math.floor(saved.expires_at / 1000),
      user: { id: saved.user_id, email: saved.email } as Session['user'],
    } as Session
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setLoading } = useAuthStore()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let initialized = false

    async function init() {
      // 1. Try normal Supabase session (from localStorage)
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        setSession(data.session)
        await saveSessionToDexie(data.session)
        initialized = true
        setLoading(false)
        return
      }

      // 2. Try restoring session from Dexie (survives browser data clears)
      const saved = await restoreSessionFromDexie()
      if (saved) {
        try {
          const { data: refreshed, error } = await supabase.auth.setSession({
            access_token: saved.access_token,
            refresh_token: saved.refresh_token,
          })
          if (!error && refreshed.session) {
            setSession(refreshed.session)
            await saveSessionToDexie(refreshed.session)
            initialized = true
            setLoading(false)
            return
          }
        } catch { /* ignored — session may have fully expired */ }
      }

      // 3. No valid session found
      if (!initialized) {
        setSession(null)
        setLoading(false)
      }
    }

    init()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        await saveSessionToDexie(session)
      } else {
        await clearSessionFromDexie()
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading])

  return <>{children}</>
}
