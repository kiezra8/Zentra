import { db } from '@/database/dexie'
import type { SyncLogEntry } from '@/types'

export async function enqueue(table_name: string, record_id: string): Promise<void> {
  const existing = await db.syncLog
    .where({ table_name, record_id })
    .filter(e => e.status === 'pending' || e.status === 'syncing')
    .first()
  if (existing) return

  const entry: SyncLogEntry = {
    table_name,
    record_id,
    status: 'pending',
    attempt_count: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  }
  await db.syncLog.add(entry)
}

export async function getPendingEntries(): Promise<SyncLogEntry[]> {
  return db.syncLog.where('status').anyOf(['pending', 'failed']).toArray()
}

export async function markSyncing(id: number): Promise<void> {
  await db.syncLog.update(id, { status: 'syncing', updated_at: Date.now() })
}

export async function markSynced(id: number): Promise<void> {
  await db.syncLog.delete(id)
}

export async function markFailed(id: number, error: string): Promise<void> {
  await db.syncLog.update(id, {
    status: 'failed',
    last_error: error,
    updated_at: Date.now(),
  })
  const entry = await db.syncLog.get(id)
  if (entry) {
    await db.syncLog.update(id, { attempt_count: (entry.attempt_count || 0) + 1 })
  }
}

export async function countPending(businessId: string): Promise<number> {
  const tables = [db.sales, db.expenses, db.products, db.customers, db.cashTransactions, db.transportTrips, db.mobileMoneyTransactions, db.incomeEntries]
  let count = 0
  for (const table of tables) {
    count += await table.where({ business_id: businessId, sync_status: 'pending' }).count()
  }
  return count
}
