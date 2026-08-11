import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Business } from '@/types/business'

interface BusinessState {
  activeBusiness: Business | null
  businesses: Business[]
  isLoadingBusinesses: boolean
  setActiveBusiness: (business: Business | null) => void
  setBusinesses: (businesses: Business[]) => void
  addBusiness: (business: Business) => void
  setLoadingBusinesses: (loading: boolean) => void
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      activeBusiness: null,
      businesses: [],
      isLoadingBusinesses: true, // start true until first load completes
      setActiveBusiness: (activeBusiness) => set({ activeBusiness }),
      setBusinesses: (businesses) => set({ businesses }),
      setLoadingBusinesses: (isLoadingBusinesses) => set({ isLoadingBusinesses }),
      addBusiness: (business) =>
        set((state) => ({
          businesses: [...state.businesses, business],
          activeBusiness: state.activeBusiness ?? business,
        })),
    }),
    {
      name: 'zentra_active_business',
      // Only persist the active business selection — loading state always resets
      partialize: (state) => ({ activeBusiness: state.activeBusiness }),
      // After rehydrating from storage, loading is still true until BusinessProvider verifies
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoadingBusinesses = true
      },
    }
  )
)
