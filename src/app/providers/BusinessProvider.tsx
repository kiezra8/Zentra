import { useEffect } from 'react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { useAuthStore } from '@/stores/authStore'

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { activeBusiness, setBusinesses, setActiveBusiness } = useBusinessStore()

  useEffect(() => {
    if (!user) return

    // Load businesses from local Dexie
    db.businesses
      .where('owner_id').equals(user.id)
      .or('owner_id').equals('demo') // Allow demo mode
      .toArray()
      .then((businesses) => {
        setBusinesses(businesses)
        // If no active business is set, pick the first one
        if (!activeBusiness && businesses.length > 0) {
          setActiveBusiness(businesses[0])
        }
      })
  }, [user, activeBusiness, setBusinesses, setActiveBusiness])

  return <>{children}</>
}
