import { useEffect } from 'react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { useAuthStore } from '@/stores/authStore'
import { pullUserBusinesses } from '@/services/sync/syncEngine'
import { isSupabaseConfigured } from '@/services/supabase/client'

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { activeBusiness, setBusinesses, setActiveBusiness, setLoadingBusinesses } = useBusinessStore()

  useEffect(() => {
    if (!user) {
      // Not logged in — stop showing loading
      setLoadingBusinesses(false)
      return
    }

    async function loadBusinesses() {
      setLoadingBusinesses(true)

      // 1. Pull from Supabase first to restore data on any device
      if (isSupabaseConfigured) {
        try {
          await pullUserBusinesses(user!.id)
        } catch {
          // Network failure is OK — we fall back to local Dexie
        }
      }

      // 2. Read from Dexie (now seeded from Supabase if online)
      const businesses = await db.businesses
        .where('owner_id').equals(user!.id)
        .or('owner_id').equals('demo')
        .toArray()

      setBusinesses(businesses)

      // 3. Restore active business:
      //    a) If persisted activeBusiness still exists in the loaded list → keep it
      //    b) Otherwise pick the first one
      const persisted = activeBusiness
      const stillExists = persisted && businesses.some(b => b.id === persisted.id)
      const targetBiz = (!stillExists && businesses.length > 0)
        ? businesses[0]
        : (stillExists ? persisted : (businesses[0] || null))

      if (!stillExists && businesses.length > 0) {
        setActiveBusiness(businesses[0])
      } else if (businesses.length === 0) {
        setActiveBusiness(null)
      }

      if (targetBiz) {
        const { fullPullFromSupabase } = await import('@/services/sync/syncEngine')
        await fullPullFromSupabase(targetBiz.id)
      }

      // 4. Ensure any restaurant orders are synced to sales
      const { syncAllOrdersToSales } = await import('@/services/orderSaleSync')
      await syncAllOrdersToSales(targetBiz?.id)

      setLoadingBusinesses(false)
    }

    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return <>{children}</>
}
