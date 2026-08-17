import Dexie, { type Table } from 'dexie'
import type {
  Sale, SaleItem, Expense, Product, Customer, CashTransaction,
  TransportTrip, MobileMoneyTransaction, IncomeEntry, SyncLogEntry,
  Patient, PatientVisit, Prescription, PatientBill, MenuItem, Order, OrderItem,
} from '@/types'
import type { Business } from '@/types/business'

export interface AuthSession {
  id: string // 'current'
  access_token: string
  refresh_token: string
  expires_at: number
  user_id: string
  email: string
}

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
  authSessions!: Table<AuthSession>
  // Clinic
  patients!: Table<Patient>
  patientVisits!: Table<PatientVisit>
  prescriptions!: Table<Prescription>
  patientBills!: Table<PatientBill>
  // Restaurant
  menuItems!: Table<MenuItem>
  orders!: Table<Order>
  orderItems!: Table<OrderItem>

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

    this.version(2).stores({
      // Add new tables
      authSessions: 'id, user_id, email',
      patients: 'id, business_id, sync_status, name, created_at',
      patientVisits: 'id, business_id, patient_id, sync_status, created_at, status',
      prescriptions: 'id, visit_id, business_id, sync_status, dispensed',
      patientBills: 'id, visit_id, business_id, sync_status, status',
      menuItems: 'id, business_id, sync_status, category, is_available',
      orders: 'id, business_id, sync_status, status, created_at, table_no',
      orderItems: 'id, order_id, menu_item_id',
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
