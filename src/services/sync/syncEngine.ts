// Sync Engine — Comprehensive multi-device synchronization for Zentra
// Synchronizes businesses, products, sales, sale_items, menu_items, orders, order_items,
// expenses, customers, cash transactions, transport, mobile money, and clinic data with Supabase.

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
  filterField: 'business_id' | 'id'
  getTable: () => Table<any, any>
}

// Parent tables directly scoped by business_id or id
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

function getLastSyncAt(): number {
  return parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0', 10)
}
function setLastSyncAt(ts: number): void {
  localStorage.setItem(LAST_SYNC_KEY, ts.toString())
}

// ─── Timestamps Normalization ────────────────────────────────────────────────
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
    if (result[field] && typeof result[field] === 'string') {
      const parsed = Date.parse(result[field])
      if (!isNaN(parsed)) result[field] = parsed
    }
  }
  return result
}

// ─── Push Dirty Records ───────────────────────────────────────────────────────
async function pushDirty(businessId: string): Promise<void> {
  // 1. Push parent tables
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

  // 2. Push Child Table: sale_items (belongs to business sales)
  try {
    const businessSales = await db.sales.where('business_id').equals(businessId).toArray()
    const saleIds = businessSales.map(s => s.id)
    if (saleIds.length > 0) {
      const dirtySaleItems = await db.saleItems
        .filter(si => saleIds.includes(si.sale_id))
        .toArray()

      for (const item of dirtySaleItems) {
        try {
          await supabase.from('sale_items').upsert(item, { onConflict: 'id' })
        } catch (err) {
          console.warn('[SyncEngine] Failed to push sale_item:', item.id, err)
        }
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to process sale_items push:', err)
  }

  // 3. Push Child Table: order_items (belongs to business orders)
  try {
    const businessOrders = await db.orders.where('business_id').equals(businessId).toArray()
    const orderIds = businessOrders.map(o => o.id)
    if (orderIds.length > 0) {
      const dirtyOrderItems = await db.orderItems
        .filter(oi => orderIds.includes(oi.order_id))
        .toArray()

      for (const item of dirtyOrderItems) {
        try {
          await supabase.from('order_items').upsert(item, { onConflict: 'id' })
        } catch (err) {
          console.warn('[SyncEngine] Failed to push order_item:', item.id, err)
        }
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to process order_items push:', err)
  }
}

// ─── Pull Remote Records ──────────────────────────────────────────────────────
async function pullRemote(businessId: string): Promise<void> {
  const lastSync = getLastSyncAt()
  const isInitialPull = lastSync === 0

  // 1. Pull Parent tables
  for (const table of SYNC_TABLES) {
    const dexieTable = table.getTable()
    if (!dexieTable) continue

    try {
      let query = supabase.from(table.supabase).select('*').eq(table.filterField, businessId)
      if (!isInitialPull) {
        const lastSyncIso = new Date(lastSync).toISOString()
        query = query.gt('updated_at', lastSyncIso)
      }

      const { data, error } = await query

      if (error || !data) {
        if (error) console.warn(`[SyncEngine] Pull error on ${table.name}:`, error.message)
        continue
      }

      for (const remote of data) {
        const normalized = normalizeFromSupabase(remote)
        const local = await dexieTable.get(remote.id)

        if (!local) {
          await dexieTable.put({ ...normalized, sync_status: 'synced' })
        } else {
          const winner = resolveConflict(
            { id: local.id, updated_at: local.updated_at, version: local.version || 1 },
            { id: remote.id, updated_at: typeof remote.updated_at === 'string' ? new Date(remote.updated_at).getTime() : remote.updated_at, version: remote.version || 1 },
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

  // 2. Pull Child Tables: sale_items & order_items
  try {
    const localSales = await db.sales.where('business_id').equals(businessId).toArray()
    const saleIds = localSales.map(s => s.id)
    if (saleIds.length > 0) {
      // Chunk in groups of 100 to avoid query size limits
      for (let i = 0; i < saleIds.length; i += 100) {
        const chunk = saleIds.slice(i, i + 100)
        const { data: remoteSaleItems } = await supabase.from('sale_items').select('*').in('sale_id', chunk)
        if (remoteSaleItems) {
          for (const item of remoteSaleItems) {
            await db.saleItems.put(item)
          }
        }
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to pull sale_items:', err)
  }

  try {
    const localOrders = await db.orders.where('business_id').equals(businessId).toArray()
    const orderIds = localOrders.map(o => o.id)
    if (orderIds.length > 0) {
      for (let i = 0; i < orderIds.length; i += 100) {
        const chunk = orderIds.slice(i, i + 100)
        const { data: remoteOrderItems } = await supabase.from('order_items').select('*').in('order_id', chunk)
        if (remoteOrderItems) {
          for (const item of remoteOrderItems) {
            await db.orderItems.put(item)
          }
        }
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to pull order_items:', err)
  }
}

// ─── Full Pull For Device Sync & First Login ─────────────────────────────────
export async function fullPullFromSupabase(businessId: string): Promise<void> {
  if (!isSupabaseConfigured || !getIsOnline()) return

  try {
    // 1. Pull the business record itself
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

        if (error || !data) continue

        for (const remote of data) {
          const normalized = normalizeFromSupabase(remote)
          await dexieTable.put({ ...normalized, sync_status: 'synced' })
        }
      } catch (err) {
        console.warn(`[SyncEngine] Full-pull failed for ${table.name}:`, err)
      }
    }

    // 3. Pull all sale_items for downloaded sales
    const sales = await db.sales.where('business_id').equals(businessId).toArray()
    const saleIds = sales.map(s => s.id)
    if (saleIds.length > 0) {
      for (let i = 0; i < saleIds.length; i += 100) {
        const chunk = saleIds.slice(i, i + 100)
        const { data: remoteSaleItems } = await supabase.from('sale_items').select('*').in('sale_id', chunk)
        if (remoteSaleItems) {
          for (const item of remoteSaleItems) {
            await db.saleItems.put(item)
          }
        }
      }
    }

    // 4. Pull all order_items for downloaded orders
    const orders = await db.orders.where('business_id').equals(businessId).toArray()
    const orderIds = orders.map(o => o.id)
    if (orderIds.length > 0) {
      for (let i = 0; i < orderIds.length; i += 100) {
        const chunk = orderIds.slice(i, i + 100)
        const { data: remoteOrderItems } = await supabase.from('order_items').select('*').in('order_id', chunk)
        if (remoteOrderItems) {
          for (const item of remoteOrderItems) {
            await db.orderItems.put(item)
          }
        }
      }
    }

    setLastSyncAt(Date.now())
  } catch (err) {
    console.error('[SyncEngine] Full pull failed:', err)
  }
}

// ─── Pull user businesses (Used at login to seed Dexie) ──────────────────────
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

      // Automatically full-pull data for this business
      await fullPullFromSupabase(remote.id)
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

// ─── Auto-sync on reconnect & periodic polling ────────────────────────────────
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

  // Sync every 30 seconds for fast multi-device updates
  syncInterval = setInterval(() => {
    if (getIsOnline() && currentBusinessId) {
      runSync(currentBusinessId)
    }
  }, 30_000)

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
