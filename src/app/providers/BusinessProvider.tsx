import { useEffect } from 'react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { useAuthStore } from '@/stores/authStore'
import { pullUserBusinesses } from '@/services/sync/syncEngine'
import { isSupabaseConfigured } from '@/services/supabase/client'

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { activeBusiness, setBusinesses, setActiveBusiness } = useBusinessStore()

  useEffect(() => {
    if (!user) return

    async function loadBusinesses() {
      // 1. First, try to pull from Supabase to restore data on fresh login
      if (isSupabaseConfigured && user) {
        await pullUserBusinesses(user.id)
      }

      // 2. Then read from local Dexie (now seeded from Supabase if online)
      const businesses = await db.businesses
        .where('owner_id').equals(user!.id)
        .or('owner_id').equals('demo')
        .toArray()

      setBusinesses(businesses)

      // If no active business is set, pick the first one
      if (!activeBusiness && businesses.length > 0) {
        setActiveBusiness(businesses[0])
      }
    }

    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return <>{children}</>
}
