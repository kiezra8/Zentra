import { useEffect } from 'react'
import { startSyncEngine } from '@/services/sync/syncEngine'
import { useBusinessStore } from '@/stores/businessStore'
import { isSupabaseConfigured } from '@/services/supabase/client'

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { activeBusiness } = useBusinessStore()

  useEffect(() => {
    if (!activeBusiness || !isSupabaseConfigured) return

    const cleanup = startSyncEngine(activeBusiness.id)
    return cleanup
  }, [activeBusiness])

  return <>{children}</>
}
