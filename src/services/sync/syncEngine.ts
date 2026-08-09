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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTable: () => Table<any, any>
}

const SYNC_TABLES: SyncMapping[] = [
  { name: 'businesses',                supabase: 'businesses',                getTable: () => db.businesses },
  { name: 'sales',                     supabase: 'sales',                     getTable: () => db.sales },
  { name: 'sale_items',                supabase: 'sale_items',                getTable: () => db.saleItems },
  { name: 'expenses',                  supabase: 'expenses',                  getTable: () => db.expenses },
  { name: 'products',                  supabase: 'products',                  getTable: () => db.products },
  { name: 'customers',                 supabase: 'customers',                 getTable: () => db.customers },
  { name: 'cash_transactions',         supabase: 'cash_transactions',         getTable: () => db.cashTransactions },
  { name: 'transport_trips',           supabase: 'transport_trips',           getTable: () => db.transportTrips },
  { name: 'mobile_money_transactions', supabase: 'mobile_money_transactions', getTable: () => db.mobileMoneyTransactions },
  { name: 'income_entries',            supabase: 'income_entries',            getTable: () => db.incomeEntries },
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
        .filter((r: { business_id?: string }) => !r.business_id || r.business_id === businessId)
        .toArray()
    } catch {
      continue
    }

    for (const record of dirty) {
      try {
        if (record.deleted_at) {
          await supabase.from(table.supabase).delete().eq('id', record.id)
        } else {
          const { error } = await supabase
            .from(table.supabase)
            .upsert({ ...record, sync_status: 'synced', synced_at: new Date().toISOString() }, { onConflict: 'id' })
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

// ─── Pull remote changes since last sync ─────────────────────────────────────
async function pullRemote(businessId: string): Promise<void> {
  const lastSync = getLastSyncAt()
  const lastSyncIso = new Date(lastSync || 0).toISOString()

  for (const table of SYNC_TABLES) {
    if (table.name === 'sale_items') continue

    const dexieTable = table.getTable()
    if (!dexieTable) continue

    try {
      const query = supabase
        .from(table.supabase)
        .select('*')
        .gt('updated_at', lastSyncIso)

      query.eq('business_id', businessId)

      const { data, error } = await query
      if (error || !data) continue

      for (const remote of data) {
        const local = await dexieTable.get(remote.id)

        if (!local) {
          await dexieTable.put({ ...remote, sync_status: 'synced' })
        } else {
          const winner = resolveConflict(
            { id: local.id, updated_at: local.updated_at, version: local.version || 1 },
            { id: remote.id, updated_at: new Date(remote.updated_at).getTime(), version: remote.version || 1 },
            table.name
          )
          if (winner === 'remote') {
            await dexieTable.put({ ...remote, sync_status: 'synced' })
          }
        }
      }
    } catch (err) {
      console.warn(`[SyncEngine] Failed to pull ${table.name}:`, err)
    }
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

  syncInterval = setInterval(() => {
    if (getIsOnline() && currentBusinessId) {
      runSync(currentBusinessId)
    }
  }, 120_000)

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
