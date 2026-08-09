import type { SyncStatus, PaymentMethod } from './business'

export interface SyncMeta {
  sync_status: SyncStatus
  synced_at?: number
  device_id: string
  version: number
  deleted_at?: number
}

export interface SyncLogEntry {
  id?: number
  table_name: string
  record_id: string
  status: SyncStatus
  attempt_count: number
  last_error?: string
  created_at: number
  updated_at: number
}

export interface ConnectivityStatus {
  isOnline: boolean
  lastChecked: number
}

export interface SyncState {
  status: 'synced' | 'syncing' | 'offline' | 'failed'
  pendingCount: number
  lastSyncAt?: number
  error?: string
}

// ─── Sales ───────────────────────────────────────
export interface Sale extends SyncMeta {
  id: string
  business_id: string
  customer_id?: string
  employee_id?: string
  total: number
  subtotal: number
  discount: number
  tax: number
  payment_method: PaymentMethod
  receipt_no?: string
  notes?: string
  created_at: number
  updated_at: number
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id?: string
  name: string
  quantity: number
  unit_price: number
  discount: number
  total: number
}

// ─── Expenses ────────────────────────────────────
export interface Expense extends SyncMeta {
  id: string
  business_id: string
  category_id?: string
  category_name: string
  amount: number
  payment_method: PaymentMethod
  description?: string
  receipt_url?: string
  created_at: number
  updated_at: number
}

export const EXPENSE_CATEGORIES = [
  { id: 'transport', name: 'Transport', emoji: '🚗' },
  { id: 'rent', name: 'Rent', emoji: '🏠' },
  { id: 'electricity', name: 'Electricity', emoji: '⚡' },
  { id: 'water', name: 'Water', emoji: '💧' },
  { id: 'airtime', name: 'Airtime', emoji: '📱' },
  { id: 'internet', name: 'Internet', emoji: '🌐' },
  { id: 'salaries', name: 'Salaries', emoji: '👷' },
  { id: 'stock', name: 'Stock / Purchases', emoji: '📦' },
  { id: 'food', name: 'Food', emoji: '🍱' },
  { id: 'repairs', name: 'Repairs', emoji: '🔧' },
  { id: 'taxes', name: 'Taxes', emoji: '🏛️' },
  { id: 'other', name: 'Other', emoji: '📝' },
]

// ─── Products ────────────────────────────────────
export interface Product extends SyncMeta {
  id: string
  business_id: string
  category_id?: string
  name: string
  sku?: string
  barcode?: string
  buying_price: number
  selling_price: number
  stock_qty: number
  min_stock: number
  supplier_id?: string
  unit?: string
  description?: string
  image_url?: string
  is_active: boolean
  created_at: number
  updated_at: number
}

// ─── Customers ───────────────────────────────────
export interface Customer extends SyncMeta {
  id: string
  business_id: string
  name: string
  phone?: string
  address?: string
  credit_balance: number
  total_purchases: number
  notes?: string
  created_at: number
  updated_at: number
}

// ─── Cash transactions ────────────────────────────
export interface CashTransaction extends SyncMeta {
  id: string
  business_id: string
  type: 'in' | 'out' | 'transfer' | 'adjustment'
  amount: number
  description: string
  payment_method: PaymentMethod
  reference?: string
  created_at: number
  updated_at: number
}

// ─── Transport ───────────────────────────────────
export interface TransportTrip extends SyncMeta {
  id: string
  business_id: string
  income: number
  fuel_cost: number
  other_cost: number
  pickup?: string
  destination?: string
  payment_method: PaymentMethod
  notes?: string
  created_at: number
  updated_at: number
}

// ─── Mobile Money ────────────────────────────────
export type MobileMoneyNetwork = 'mtn' | 'airtel' | 'bank' | 'other'
export type MobileMoneyTxType = 'deposit' | 'withdrawal' | 'transfer' | 'commission' | 'adjustment'

export interface MobileMoneyTransaction extends SyncMeta {
  id: string
  business_id: string
  network: MobileMoneyNetwork
  type: MobileMoneyTxType
  amount: number
  commission: number
  tx_ref?: string
  customer_ref?: string
  notes?: string
  created_at: number
  updated_at: number
}

// ─── Income (Hustler) ────────────────────────────
export interface IncomeEntry extends SyncMeta {
  id: string
  business_id: string
  description: string
  amount: number
  source?: string
  payment_method: PaymentMethod
  notes?: string
  created_at: number
  updated_at: number
}
