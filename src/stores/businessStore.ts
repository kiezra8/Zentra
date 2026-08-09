import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Business } from '@/types/business'

interface BusinessState {
  activeBusiness: Business | null
  businesses: Business[]
  setActiveBusiness: (business: Business | null) => void
  setBusinesses: (businesses: Business[]) => void
  addBusiness: (business: Business) => void
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      activeBusiness: null,
      businesses: [],
      setActiveBusiness: (activeBusiness) => set({ activeBusiness }),
      setBusinesses: (businesses) => set({ businesses }),
      addBusiness: (business) =>
        set((state) => ({
          businesses: [...state.businesses, business],
          activeBusiness: state.activeBusiness ?? business,
        })),
    }),
    {
      name: 'zentra_active_business',
      partialize: (state) => ({ activeBusiness: state.activeBusiness }),
    }
  )
)
