import Dexie, { type Table } from 'dexie'
import type {
  Sale, SaleItem, Expense, Product, Customer, CashTransaction,
  TransportTrip, MobileMoneyTransaction, IncomeEntry, SyncLogEntry,
} from '@/types'
import type { Business } from '@/types/business'

class ZentraDB extends Dexie {
  businesses!: Table<Business>
  sales!: Table<Sale>
  saleItems!: Table<SaleItem>
  expenses!: Table<Expense>
  products!: Table<Product>
  customers!: Table<Customer>
  cashTransactions!: Table<CashTransaction>
  transportTrips!: Table<TransportTrip>
  mobileMoneyTransactions!: Table<MobileMoneyTransaction>
  incomeEntries!: Table<IncomeEntry>
  syncLog!: Table<SyncLogEntry>

  constructor() {
    super('zentra_v1')

    this.version(1).stores({
      businesses: 'id, owner_id, sync_status, updated_at',
      sales: 'id, business_id, created_at, sync_status, payment_method, customer_id',
      saleItems: 'id, sale_id, product_id',
      expenses: 'id, business_id, created_at, sync_status, category_id',
      products: 'id, business_id, sync_status, sku, barcode, is_active',
      customers: 'id, business_id, sync_status, name',
      cashTransactions: 'id, business_id, created_at, sync_status, type',
      transportTrips: 'id, business_id, created_at, sync_status',
      mobileMoneyTransactions: 'id, business_id, created_at, sync_status, network, type',
      incomeEntries: 'id, business_id, created_at, sync_status',
      syncLog: '++id, table_name, record_id, status, created_at',
    })
  }
}

export const db = new ZentraDB()

// ─── Helper: build sync meta defaults ────────────────
import { getDeviceId } from '@/utils/deviceId'

export function buildSyncMeta() {
  return {
    sync_status: 'pending' as const,
    device_id: getDeviceId(),
    version: 1,
    synced_at: undefined,
    deleted_at: undefined,
  }
}
