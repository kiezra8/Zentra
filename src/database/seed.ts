import { db, buildSyncMeta } from './dexie'
import type { Business } from '@/types/business'
import type { Sale, Expense, TransportTrip, MobileMoneyTransaction, IncomeEntry } from '@/types'

export async function loadDemoData(): Promise<void> {
  const now = Date.now()
  const hour = 3600_000

  // 1. Demo Businesses
  const demoBizs: Business[] = [
    {
      id: 'demo-retail-1',
      owner_id: 'demo',
      name: 'Kikubo General Traders',
      category: 'retail',
      currency: 'UGX',
      location: 'Kikubo Lane, Kampala',
      has_employees: true,
      settings: { currency: 'UGX', currency_symbol: 'UGX', currency_position: 'before', low_stock_threshold: 5, tax_rate: 0, theme: 'light' },
      created_at: now - 86400000 * 30,
      updated_at: now,
      ...buildSyncMeta(),
    },
    {
      id: 'demo-boda-1',
      owner_id: 'demo',
      name: 'Express Boda Rider',
      category: 'boda_boda',
      currency: 'UGX',
      location: 'Wandegeya Stage',
      has_employees: false,
      settings: { currency: 'UGX', currency_symbol: 'UGX', currency_position: 'before', low_stock_threshold: 0, tax_rate: 0, theme: 'light' },
      created_at: now - 86400000 * 15,
      updated_at: now,
      ...buildSyncMeta(),
    },
    {
      id: 'demo-mm-1',
      owner_id: 'demo',
      name: 'Nakawa Cash & Mobile Money Agent',
      category: 'mobile_money',
      currency: 'UGX',
      location: 'Nakawa Market',
      has_employees: false,
      settings: { currency: 'UGX', currency_symbol: 'UGX', currency_position: 'before', low_stock_threshold: 0, tax_rate: 0, theme: 'light' },
      created_at: now - 86400000 * 20,
      updated_at: now,
      ...buildSyncMeta(),
    },
    {
      id: 'demo-hustler-1',
      owner_id: 'demo',
      name: 'Sarah\'s Clothing Hustle',
      category: 'hustler',
      currency: 'UGX',
      location: 'Owino Market',
      has_employees: false,
      settings: { currency: 'UGX', currency_symbol: 'UGX', currency_position: 'before', low_stock_threshold: 0, tax_rate: 0, theme: 'light' },
      created_at: now - 86400000 * 10,
      updated_at: now,
      ...buildSyncMeta(),
    },
  ]

  for (const b of demoBizs) {
    await db.businesses.put(b)
  }

  // 2. Demo Sales
  const sales: Sale[] = [
    { id: 'sale-1', business_id: 'demo-retail-1', total: 45000, subtotal: 45000, discount: 0, tax: 0, payment_method: 'cash', receipt_no: 'S1001', created_at: now - hour * 2, updated_at: now - hour * 2, ...buildSyncMeta() },
    { id: 'sale-2', business_id: 'demo-retail-1', total: 120000, subtotal: 120000, discount: 0, tax: 0, payment_method: 'mtn_mobile_money', receipt_no: 'S1002', created_at: now - hour * 5, updated_at: now - hour * 5, ...buildSyncMeta() },
    { id: 'sale-3', business_id: 'demo-retail-1', total: 15000, subtotal: 15000, discount: 0, tax: 0, payment_method: 'cash', receipt_no: 'S1003', created_at: now - hour * 8, updated_at: now - hour * 8, ...buildSyncMeta() },
  ]
  for (const s of sales) await db.sales.put(s)

  // 3. Demo Expenses
  const expenses: Expense[] = [
    { id: 'exp-1', business_id: 'demo-retail-1', category_name: 'Transport', amount: 12000, payment_method: 'cash', description: 'Boda for goods delivery', created_at: now - hour * 4, updated_at: now - hour * 4, ...buildSyncMeta() },
    { id: 'exp-2', business_id: 'demo-retail-1', category_name: 'Rent', amount: 150000, payment_method: 'bank', description: 'Stall rent portion', created_at: now - 86400000 * 2, updated_at: now - 86400000 * 2, ...buildSyncMeta() },
  ]
  for (const e of expenses) await db.expenses.put(e)

  // 4. Demo Transport Trips
  const trips: TransportTrip[] = [
    { id: 'trip-1', business_id: 'demo-boda-1', income: 7000, fuel_cost: 0, other_cost: 0, pickup: 'Wandegeya', destination: 'Kololo', payment_method: 'cash', created_at: now - hour * 1, updated_at: now - hour * 1, ...buildSyncMeta() },
    { id: 'trip-2', business_id: 'demo-boda-1', income: 15000, fuel_cost: 5000, other_cost: 0, pickup: 'Old Taxi Park', destination: 'Ntinda', payment_method: 'cash', created_at: now - hour * 3, updated_at: now - hour * 3, ...buildSyncMeta() },
  ]
  for (const t of trips) await db.transportTrips.put(t)

  // 5. Demo Mobile Money
  const mmTxs: MobileMoneyTransaction[] = [
    { id: 'mm-1', business_id: 'demo-mm-1', network: 'mtn', type: 'deposit', amount: 100000, commission: 850, tx_ref: '91823719', created_at: now - hour * 2, updated_at: now - hour * 2, ...buildSyncMeta() },
    { id: 'mm-2', business_id: 'demo-mm-1', network: 'airtel', type: 'withdrawal', amount: 50000, commission: 450, tx_ref: '77218391', created_at: now - hour * 4, updated_at: now - hour * 4, ...buildSyncMeta() },
  ]
  for (const m of mmTxs) await db.mobileMoneyTransactions.put(m)

  // 6. Demo Hustler Income
  const hustles: IncomeEntry[] = [
    { id: 'hustle-1', business_id: 'demo-hustler-1', description: 'Sold 2 jackets at market', amount: 65000, source: 'Selling Clothes', payment_method: 'cash', created_at: now - hour * 2, updated_at: now - hour * 2, ...buildSyncMeta() },
  ]
  for (const h of hustles) await db.incomeEntries.put(h)
}
