import { useEffect } from 'react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { useAuthStore } from '@/stores/authStore'
import { pullUserBusinesses, fullPullFromSupabase } from '@/services/sync/syncEngine'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { syncAllOrdersToSales } from '@/services/orderSaleSync'
import type { Business } from '@/types/business'

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { activeBusiness, setBusinesses, setActiveBusiness, setLoadingBusinesses } = useBusinessStore()

  useEffect(() => {
    if (!user) {
      setLoadingBusinesses(false)
      return
    }

    async function loadBusinesses() {
      setLoadingBusinesses(true)

      // 1. Pull all businesses (and their full data) from Supabase into Dexie
      if (isSupabaseConfigured) {
        try {
          await pullUserBusinesses(user!.id)
        } catch {
          // Network failure — fall back to local Dexie
        }
      }

      // 2. Read from Dexie (seeded from Supabase if online)
      const businesses = await db.businesses
        .where('owner_id').equals(user!.id)
        .or('owner_id').equals('demo')
        .toArray()

      setBusinesses(businesses)

      // 3. Restore active business
      const persisted = activeBusiness
      const stillExists = persisted && businesses.some(b => b.id === persisted.id)

      let targetBiz: Business | null = stillExists ? persisted : (businesses[0] ?? null)

      if (!stillExists && businesses.length > 0) {
        targetBiz = businesses[0]
        setActiveBusiness(businesses[0])
      } else if (businesses.length === 0) {
        targetBiz = null
        setActiveBusiness(null)
      }

      // 4. Ensure full data pull for the active business (menu, orders, sales, stock, etc.)
      if (targetBiz && isSupabaseConfigured) {
        try {
          await fullPullFromSupabase(targetBiz.id)
        } catch {
          // ignore offline
        }
      }

      // 5. Ensure restaurant orders appear in sales & income
      if (targetBiz) {
        syncAllOrdersToSales(targetBiz.id).catch(console.error)
      }

      setLoadingBusinesses(false)
    }

    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return <>{children}</>
}
