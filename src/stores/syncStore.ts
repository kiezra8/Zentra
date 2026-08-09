import { create } from 'zustand'

export type SyncStatusValue = 'synced' | 'syncing' | 'offline' | 'failed'

interface SyncStore {
  status: SyncStatusValue
  pendingCount: number
  lastSyncAt: number | null
  error: string | null
  setStatus: (status: SyncStatusValue) => void
  setPendingCount: (count: number) => void
  setLastSyncAt: (ts: number) => void
  setError: (error: string | null) => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: navigator.onLine ? 'synced' : 'offline',
  pendingCount: 0,
  lastSyncAt: null,
  error: null,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setError: (error) => set({ error }),
}))
