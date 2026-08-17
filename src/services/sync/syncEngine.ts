// Sync Engine — Comprehensive multi-device synchronization for Zentra
// Synchronizes ALL data across devices: menu_items, orders, order_items, 
// sales, sale_items, products, expenses, customers, cashbook, clinic data.

import { db } from '@/database/dexie'
import { supabase, isSupabaseConfigured } from '@/services/supabase/client'
import { getIsOnline, onConnectivityChange } from './connectivity'
import { resolveConflict } from './conflictResolver'
import { useSyncStore } from '@/stores/syncStore'
import type { Table } from 'dexie'

// Per-business sync key so each business has its own last-sync timestamp
function getLastSyncKey(businessId: string) {
  return `zentra_last_sync_${businessId}`
}
function getLastSyncAt(businessId: string): number {
  return parseInt(localStorage.getItem(getLastSyncKey(businessId)) || '0', 10)
}
function setLastSyncAt(businessId: string, ts: number): void {
  localStorage.setItem(getLastSyncKey(businessId), ts.toString())
}

interface SyncMapping {
  name: string
  supabase: string
  filterField: 'business_id' | 'id'
  getTable: () => Table<any, any>
}

// All parent tables scoped directly by business_id or id
const SYNC_TABLES: SyncMapping[] = [
  { name: 'businesses',                supabase: 'businesses',                filterField: 'id',          getTable: () => db.businesses },
  { name: 'products',                  supabase: 'products',                  filterField: 'business_id', getTable: () => db.products },
  { name: 'sales',                     supabase: 'sales',                     filterField: 'business_id', getTable: () => db.sales },
  { name: 'expenses',                  supabase: 'expenses',                  filterField: 'business_id', getTable: () => db.expenses },
  { name: 'customers',                 supabase: 'customers',                 filterField: 'business_id', getTable: () => db.customers },
  { name: 'cash_transactions',         supabase: 'cash_transactions',         filterField: 'business_id', getTable: () => db.cashTransactions },
  { name: 'transport_trips',           supabase: 'transport_trips',           filterField: 'business_id', getTable: () => db.transportTrips },
  { name: 'mobile_money_transactions', supabase: 'mobile_money_transactions', filterField: 'business_id', getTable: () => db.mobileMoneyTransactions },
  { name: 'income_entries',            supabase: 'income_entries',            filterField: 'business_id', getTable: () => db.incomeEntries },
  // Restaurant
  { name: 'menu_items',                supabase: 'menu_items',                filterField: 'business_id', getTable: () => db.menuItems },
  { name: 'orders',                    supabase: 'orders',                    filterField: 'business_id', getTable: () => db.orders },
  // Clinic
  { name: 'patients',                  supabase: 'patients',                  filterField: 'business_id', getTable: () => db.patients },
  { name: 'patient_visits',            supabase: 'patient_visits',            filterField: 'business_id', getTable: () => db.patientVisits },
  { name: 'prescriptions',             supabase: 'prescriptions',             filterField: 'business_id', getTable: () => db.prescriptions },
  { name: 'patient_bills',             supabase: 'patient_bills',             filterField: 'business_id', getTable: () => db.patientBills },
]

let isSyncing = false

// ─── Timestamp Normalization ─────────────────────────────────────────────────
const TS_FIELDS = [
  'created_at', 'updated_at', 'synced_at', 'deleted_at',
  'subscription_expires_at', 'expiry_date', 'sale_date', 'visit_date', 'dispensed_at'
]

export function normalizeForSupabase(record: Record<string, any>): Record<string, any> {
  const result = { ...record }
  for (const field of TS_FIELDS) {
    if (result[field] !== undefined && result[field] !== null) {
      if (typeof result[field] === 'number' && result[field] > 0) {
        result[field] = new Date(result[field]).toISOString()
      }
    }
  }
  return result
}

export function normalizeFromSupabase(record: Record<string, any>): Record<string, any> {
  const result = { ...record }
  for (const field of TS_FIELDS) {
    if (result[field]) {
      if (typeof result[field] === 'string') {
        const parsed = Date.parse(result[field])
        if (!isNaN(parsed)) result[field] = parsed
      }
      // If already a number (BIGINT stored as ms), keep it
    }
  }
  return result
}

// ─── Helper: Push a single record to Supabase ────────────────────────────────
async function pushRecord(tableName: string, record: Record<string, any>): Promise<boolean> {
  try {
    if (record.deleted_at) {
      await supabase.from(tableName).delete().eq('id', record.id)
    } else {
      const normalized = normalizeForSupabase(record)
      const { error } = await supabase
        .from(tableName)
        .upsert({ ...normalized, sync_status: 'synced', synced_at: new Date().toISOString() }, { onConflict: 'id' })
      if (error) {
        console.warn(`[SyncEngine] Upsert error on ${tableName}/${record.id}:`, error.message)
        return false
      }
    }
    return true
  } catch (err) {
    console.warn(`[SyncEngine] pushRecord failed ${tableName}/${record.id}:`, err)
    return false
  }
}

// ─── Push ALL Dirty Records ───────────────────────────────────────────────────
async function pushDirty(businessId: string): Promise<void> {
  // 1. Push parent tables
  for (const table of SYNC_TABLES) {
    const dexieTable = table.getTable()
    if (!dexieTable) continue

    let dirty: any[]
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
      const ok = await pushRecord(table.supabase, record)
      if (ok) {
        await dexieTable.update(record.id, { sync_status: 'synced', synced_at: Date.now() })
      } else {
        await dexieTable.update(record.id, { sync_status: 'failed' })
      }
    }
  }

  // 2. Push sale_items (child of sales)
  try {
    const businessSales = await db.sales.where('business_id').equals(businessId).toArray()
    const saleIds = new Set(businessSales.map(s => s.id))
    if (saleIds.size > 0) {
      // Get ALL sale items, not just pending, since they have no sync_status
      const allSaleItems = await db.saleItems.filter(si => saleIds.has(si.sale_id)).toArray()
      for (const item of allSaleItems) {
        const { error } = await supabase
          .from('sale_items')
          .upsert(item, { onConflict: 'id' })
        if (error) console.warn('[SyncEngine] Failed to push sale_item:', item.id, error.message)
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to push sale_items:', err)
  }

  // 3. Push order_items (child of orders)
  try {
    const businessOrders = await db.orders.where('business_id').equals(businessId).toArray()
    const orderIds = new Set(businessOrders.map(o => o.id))
    if (orderIds.size > 0) {
      const allOrderItems = await db.orderItems.filter(oi => orderIds.has(oi.order_id)).toArray()
      for (const item of allOrderItems) {
        const { error } = await supabase
          .from('order_items')
          .upsert(item, { onConflict: 'id' })
        if (error) console.warn('[SyncEngine] Failed to push order_item:', item.id, error.message)
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to push order_items:', err)
  }
}

// ─── Pull Remote (Incremental) ────────────────────────────────────────────────
async function pullRemote(businessId: string): Promise<void> {
  const lastSync = getLastSyncAt(businessId)

  for (const table of SYNC_TABLES) {
    const dexieTable = table.getTable()
    if (!dexieTable) continue

    try {
      let query = supabase.from(table.supabase).select('*').eq(table.filterField, businessId)
      if (lastSync > 0) {
        const lastSyncIso = new Date(lastSync).toISOString()
        query = query.gte('updated_at', lastSyncIso)
      }

      const { data, error } = await query

      if (error) {
        console.warn(`[SyncEngine] Pull error on ${table.name}:`, error.message)
        continue
      }
      if (!data || data.length === 0) continue

      for (const remote of data) {
        const normalized = normalizeFromSupabase(remote)
        const local = await dexieTable.get(remote.id)

        if (!local) {
          await dexieTable.put({ ...normalized, sync_status: 'synced' })
        } else {
          const remoteUpdatedAt = typeof remote.updated_at === 'string'
            ? new Date(remote.updated_at).getTime()
            : (remote.updated_at || 0)
          const winner = resolveConflict(
            { id: local.id, updated_at: local.updated_at || 0, version: local.version || 1 },
            { id: remote.id, updated_at: remoteUpdatedAt, version: remote.version || 1 },
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

  // Pull child items for any newly-downloaded parents
  await pullChildItems(businessId)
}

// ─── Pull child items (sale_items, order_items) ───────────────────────────────
async function pullChildItems(businessId: string): Promise<void> {
  // Pull sale_items
  try {
    const localSales = await db.sales.where('business_id').equals(businessId).toArray()
    const saleIds = localSales.map(s => s.id)
    if (saleIds.length > 0) {
      for (let i = 0; i < saleIds.length; i += 50) {
        const chunk = saleIds.slice(i, i + 50)
        const { data } = await supabase.from('sale_items').select('*').in('sale_id', chunk)
        if (data) {
          for (const item of data) {
            await db.saleItems.put(item)
          }
        }
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to pull sale_items:', err)
  }

  // Pull order_items
  try {
    const localOrders = await db.orders.where('business_id').equals(businessId).toArray()
    const orderIds = localOrders.map(o => o.id)
    if (orderIds.length > 0) {
      for (let i = 0; i < orderIds.length; i += 50) {
        const chunk = orderIds.slice(i, i + 50)
        const { data } = await supabase.from('order_items').select('*').in('order_id', chunk)
        if (data) {
          for (const item of data) {
            await db.orderItems.put(item)
          }
        }
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to pull order_items:', err)
  }
}

// ─── Full Pull (initial device setup, or forced refresh) ────────────────────
export async function fullPullFromSupabase(businessId: string): Promise<void> {
  if (!isSupabaseConfigured || !getIsOnline()) return

  console.log('[SyncEngine] Full pull starting for', businessId)
  try {
    // 1. Pull business record
    const { data: bizData } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (bizData) {
      const normalized = normalizeFromSupabase(bizData)
      await db.businesses.put({ ...normalized, sync_status: 'synced' } as any)
    }

    // 2. Pull all parent tables
    for (const table of SYNC_TABLES) {
      if (table.name === 'businesses') continue
      const dexieTable = table.getTable()
      if (!dexieTable) continue

      try {
        const { data, error } = await supabase
          .from(table.supabase)
          .select('*')
          .eq('business_id', businessId)

        if (error) {
          console.warn(`[SyncEngine] Full pull error on ${table.name}:`, error.message)
          continue
        }
        if (!data || data.length === 0) continue

        for (const remote of data) {
          const normalized = normalizeFromSupabase(remote)
          await dexieTable.put({ ...normalized, sync_status: 'synced' })
        }

        console.log(`[SyncEngine] Full pulled ${data.length} records from ${table.name}`)
      } catch (err) {
        console.warn(`[SyncEngine] Full pull failed for ${table.name}:`, err)
      }
    }

    // 3. Pull all sale_items and order_items
    await pullChildItems(businessId)

    // Mark sync timestamp so next poll is incremental
    setLastSyncAt(businessId, Date.now())
    console.log('[SyncEngine] Full pull complete for', businessId)
  } catch (err) {
    console.error('[SyncEngine] Full pull failed:', err)
  }
}

// ─── Pull user businesses (used at login) ────────────────────────────────────
export async function pullUserBusinesses(userId: string): Promise<import('@/types/business').Business[]> {
  if (!isSupabaseConfigured || !getIsOnline()) return []

  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)

    if (error || !data || data.length === 0) return []

    const list: import('@/types/business').Business[] = []
    for (const remote of data) {
      const normalized = normalizeFromSupabase(remote)
      await db.businesses.put({ ...normalized, sync_status: 'synced' } as any)
      list.push(normalized as import('@/types/business').Business)
    }

    // Full pull for each business — downloads menus, orders, sales, etc.
    for (const biz of list) {
      await fullPullFromSupabase(biz.id)
    }

    return list
  } catch (err) {
    console.warn('[SyncEngine] Failed to pull user businesses:', err)
    return []
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
    setLastSyncAt(businessId, Date.now())
    store.setStatus('synced')
    store.setLastSyncAt(Date.now())
  } catch (err) {
    console.error('[SyncEngine] Sync failed:', err)
    store.setStatus('failed')
  } finally {
    isSyncing = false
  }
}

// ─── Auto-sync on reconnect & polling ────────────────────────────────────────
let currentBusinessId: string | null = null
let syncInterval: ReturnType<typeof setInterval> | null = null

export function startSyncEngine(businessId: string): () => void {
  currentBusinessId = businessId

  // Reset last sync for this business so we do a full pull on reconnect if it's been long
  const lastSync = getLastSyncAt(businessId)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  if (lastSync < fiveMinutesAgo) {
    // Force a full pull to catch any data added on other devices
    console.log('[SyncEngine] Last sync was long ago, doing full pull first')
    if (getIsOnline()) {
      fullPullFromSupabase(businessId).catch(console.error)
    }
  }

  const cleanup = onConnectivityChange(async (online) => {
    if (online && currentBusinessId) {
      // On reconnect do a full pull to catch anything missed while offline
      await fullPullFromSupabase(currentBusinessId)
      await runSync(currentBusinessId)
    } else if (!online) {
      useSyncStore.getState().setStatus('offline')
    }
  })

  // Sync every 15 seconds for near-realtime multi-device updates
  syncInterval = setInterval(() => {
    if (getIsOnline() && currentBusinessId) {
      runSync(currentBusinessId)
    }
  }, 15_000)

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
