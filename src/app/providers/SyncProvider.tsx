import { useEffect, useRef } from 'react'
import { startSyncEngine, fullPullFromSupabase } from '@/services/sync/syncEngine'
import { useBusinessStore } from '@/stores/businessStore'
import { isSupabaseConfigured } from '@/services/supabase/client'

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { activeBusiness } = useBusinessStore()
  const prevBusinessId = useRef<string | null>(null)

  useEffect(() => {
    if (!activeBusiness || !isSupabaseConfigured) return

    const businessId = activeBusiness.id

    // If the active business changed, do a fresh full pull to grab the new business's data
    if (prevBusinessId.current !== businessId) {
      prevBusinessId.current = businessId
      fullPullFromSupabase(businessId).catch(console.error)
    }

    const cleanup = startSyncEngine(businessId)
    return cleanup
  }, [activeBusiness?.id])

  return <>{children}</>
}
