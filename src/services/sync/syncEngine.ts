// Sync Engine — orchestrates push → pull → conflict resolution → mark synced

import { db } from '@/database/dexie'
import { supabase, isSupabaseConfigured } from '@/services/supabase/client'
import { getIsOnline, onConnectivityChange } from './connectivity'
import { resolveConflict } from './conflictResolver'
import { useSyncStore } from '@/stores/syncStore'
import type { Table } from 'dexie'

const LAST_SYNC_KEY = 'zentra_last_sync_at'

interface SyncMapping {
  name: string
  supabase: string
  filterField: 'business_id' | 'id' // how to scope to a business
  getTable: () => Table<any, any>
}

const SYNC_TABLES: SyncMapping[] = [
  { name: 'businesses',                supabase: 'businesses',                filterField: 'id',          getTable: () => db.businesses },
  { name: 'sales',                     supabase: 'sales',                     filterField: 'business_id', getTable: () => db.sales },
  { name: 'sale_items',                supabase: 'sale_items',                filterField: 'business_id', getTable: () => db.saleItems },
  { name: 'expenses',                  supabase: 'expenses',                  filterField: 'business_id', getTable: () => db.expenses },
  { name: 'products',                  supabase: 'products',                  filterField: 'business_id', getTable: () => db.products },
  { name: 'customers',                 supabase: 'customers',                 filterField: 'business_id', getTable: () => db.customers },
  { name: 'cash_transactions',         supabase: 'cash_transactions',         filterField: 'business_id', getTable: () => db.cashTransactions },
  { name: 'transport_trips',           supabase: 'transport_trips',           filterField: 'business_id', getTable: () => db.transportTrips },
  { name: 'mobile_money_transactions', supabase: 'mobile_money_transactions', filterField: 'business_id', getTable: () => db.mobileMoneyTransactions },
  { name: 'income_entries',            supabase: 'income_entries',            filterField: 'business_id', getTable: () => db.incomeEntries },
]

let isSyncing = false

function getLastSyncAt(): number {
  return parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0', 10)
}
function setLastSyncAt(ts: number): void {
  localStorage.setItem(LAST_SYNC_KEY, ts.toString())
}

// ─── Push dirty records to Supabase ──────────────────────────────────────────
async function pushDirty(businessId: string): Promise<void> {
  for (const table of SYNC_TABLES) {
    const dexieTable = table.getTable()
    if (!dexieTable) continue

    let dirty
    try {
      dirty = await dexieTable
        .where('sync_status').anyOf(['pending', 'failed'])
        .filter((r: { business_id?: string; id?: string }) => {
          if (table.filterField === 'id') return r.id === businessId
          return !r.business_id || r.business_id === businessId
        })
        .toArray()
    } catch {
      continue
    }

    for (const record of dirty) {
      try {
        if (record.deleted_at) {
          await supabase.from(table.supabase).delete().eq('id', record.id)
        } else {
          // Normalize timestamps for Supabase (expects ISO strings, not epoch ms)
          const normalized = normalizeForSupabase(record)
          const { error } = await supabase
            .from(table.supabase)
            .upsert({ ...normalized, sync_status: 'synced', synced_at: new Date().toISOString() }, { onConflict: 'id' })
          if (error) throw error
        }

        await dexieTable.update(record.id, {
          sync_status: 'synced',
          synced_at: Date.now(),
        })
      } catch (err) {
        await dexieTable.update(record.id, { sync_status: 'failed' })
        console.warn(`[SyncEngine] Failed to push ${table.name}/${record.id}:`, err)
      }
    }
  }
}

// Normalize epoch timestamps to ISO strings for Supabase
function normalizeForSupabase(record: Record<string, any>): Record<string, any> {
  const tsFields = ['created_at', 'updated_at', 'synced_at', 'subscription_expires_at', 'expiry_date', 'sale_date']
  const result = { ...record }
  for (const field of tsFields) {
    if (result[field] && typeof result[field] === 'number' && result[field] > 1000000000000) {
      result[field] = new Date(result[field]).toISOString()
    }
  }
  return result
}

// ─── Pull remote changes since last sync ─────────────────────────────────────
async function pullRemote(businessId: string): Promise<void> {
  const lastSync = getLastSyncAt()
  const lastSyncIso = new Date(lastSync || 0).toISOString()

  for (const table of SYNC_TABLES) {
    const dexieTable = table.getTable()
    if (!dexieTable) continue

    try {
      // Properly chain the filter — this was the bug before (filter was on a discarded value)
      const { data, error } = await supabase
        .from(table.supabase)
        .select('*')
        .gt('updated_at', lastSyncIso)
        .eq(table.filterField, businessId)

      if (error || !data) {
        if (error) console.warn(`[SyncEngine] Pull error ${table.name}:`, error.message)
        continue
      }

      for (const remote of data) {
        const local = await dexieTable.get(remote.id)
        // Convert ISO timestamps back to epoch ms for Dexie
        const normalized = normalizeFromSupabase(remote)

        if (!local) {
          await dexieTable.put({ ...normalized, sync_status: 'synced' })
        } else {
          const winner = resolveConflict(
            { id: local.id, updated_at: local.updated_at, version: local.version || 1 },
            { id: remote.id, updated_at: new Date(remote.updated_at).getTime(), version: remote.version || 1 },
            table.name
          )
          if (winner === 'remote') {
            await dexieTable.put({ ...normalized, sync_status: 'synced' })
          }
        }
      }
    } catch (err) {
      console.warn(`[SyncEngine] Failed to pull ${table.name}:`, err)
    }
  }
}

// Convert ISO timestamps from Supabase back to epoch ms for Dexie
function normalizeFromSupabase(record: Record<string, any>): Record<string, any> {
  const tsFields = ['created_at', 'updated_at', 'synced_at', 'subscription_expires_at', 'expiry_date', 'sale_date']
  const result = { ...record }
  for (const field of tsFields) {
    if (result[field] && typeof result[field] === 'string') {
      const parsed = Date.parse(result[field])
      if (!isNaN(parsed)) result[field] = parsed
    }
  }
  return result
}

// ─── Full pull for initial login (no timestamp filter) ───────────────────────
export async function fullPullFromSupabase(businessId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  // First: pull the business record itself
  const { data: bizData } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()

  if (bizData) {
    const normalized = normalizeFromSupabase(bizData)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.businesses.put({ ...normalized, sync_status: 'synced' } as any)
  }

  // Then pull all related tables
  for (const table of SYNC_TABLES) {
    if (table.name === 'businesses') continue
    const dexieTable = table.getTable()
    if (!dexieTable) continue

    try {
      const { data, error } = await supabase
        .from(table.supabase)
        .select('*')
        .eq('business_id', businessId)

      if (error || !data) continue

      for (const remote of data) {
        const normalized = normalizeFromSupabase(remote)
        await dexieTable.put({ ...normalized, sync_status: 'synced' })
      }
    } catch (err) {
      console.warn(`[SyncEngine] Failed to full-pull ${table.name}:`, err)
    }
  }
}

// ─── Pull businesses for a user (used at login to seed Dexie) ────────────────
export async function pullUserBusinesses(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)

    if (error || !data) return

    for (const remote of data) {
      const normalized = normalizeFromSupabase(remote)
      const existing = await db.businesses.get(remote.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!existing) {
        await db.businesses.put({ ...normalized, sync_status: 'synced' } as any)
      } else if (new Date(remote.updated_at).getTime() > (existing.updated_at || 0)) {
        await db.businesses.put({ ...normalized, sync_status: 'synced' } as any)
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to pull user businesses:', err)
  }
}

// ─── Main sync orchestrator ───────────────────────────────────────────────────
export async function runSync(businessId: string): Promise<void> {
  if (isSyncing || !getIsOnline() || !isSupabaseConfigured) return

  isSyncing = true
  const store = useSyncStore.getState()
  store.setStatus('syncing')

  try {
    await pushDirty(businessId)
    await pullRemote(businessId)
    setLastSyncAt(Date.now())
    store.setStatus('synced')
    store.setLastSyncAt(Date.now())
  } catch (err) {
    console.error('[SyncEngine] Sync failed:', err)
    store.setStatus('failed')
  } finally {
    isSyncing = false
  }
}

// ─── Auto-sync on reconnect ───────────────────────────────────────────────────
let currentBusinessId: string | null = null
let syncInterval: ReturnType<typeof setInterval> | null = null

export function startSyncEngine(businessId: string): () => void {
  currentBusinessId = businessId

  const cleanup = onConnectivityChange(async (online) => {
    if (online && currentBusinessId) {
      await runSync(currentBusinessId)
    } else if (!online) {
      useSyncStore.getState().setStatus('offline')
    }
  })

  // Sync every 2 minutes
  syncInterval = setInterval(() => {
    if (getIsOnline() && currentBusinessId) {
      runSync(currentBusinessId)
    }
  }, 120_000)

  // Initial sync on start
  if (getIsOnline()) {
    runSync(businessId)
  } else {
    useSyncStore.getState().setStatus('offline')
  }

  return () => {
    cleanup()
    if (syncInterval) clearInterval(syncInterval)
  }
}
