// Retail Dashboard — for retail, wholesale, general, custom businesses
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency, formatCompact } from '@/utils/currency'
import { formatRelative, startOfDay, endOfDay } from '@/utils/date'
import { BUSINESS_CATEGORIES } from '@/types/business'
import { ProfitCard, QuickActionsGrid } from '@/components/dashboard/DashboardShell'

export default function RetailDashboard() {
  const { activeBusiness } = useBusinessStore()
  const catConfig = BUSINESS_CATEGORIES.find(c => c.id === activeBusiness?.category)
  const s = startOfDay(), e = endOfDay()

  const todaySales = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.sales.where('business_id').equals(activeBusiness.id)
      .filter(x => x.created_at >= s && x.created_at <= e && !x.deleted_at).toArray()
  }, [activeBusiness?.id])

  const todayExpenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses.where('business_id').equals(activeBusiness.id)
      .filter(x => x.created_at >= s && x.created_at <= e && !x.deleted_at).toArray()
  }, [activeBusiness?.id])

  const lowStock = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.products.where('business_id').equals(activeBusiness.id)
      .filter(p => p.is_active && p.stock_qty <= p.min_stock).toArray()
  }, [activeBusiness?.id])

  const recentSales = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.sales.where('business_id').equals(activeBusiness.id)
      .filter(x => !x.deleted_at).reverse().limit(5).toArray()
  }, [activeBusiness?.id])

  const income = todaySales?.reduce((s, t) => s + t.total, 0) ?? 0
  const expenses = todayExpenses?.reduce((s, t) => s + t.amount, 0) ?? 0

  if (!activeBusiness) return null

  return (
    <div className="page-container">
      <ProfitCard
        income={income} expenses={expenses}
        businessName={activeBusiness.name}
        businessEmoji={catConfig?.emoji ?? '🏪'}
        extraStats={[
          { label: 'Sales', value: todaySales?.length ?? 0, emoji: '🧾' },
          ...(lowStock && lowStock.length > 0 ? [{ label: 'Low Stock', value: lowStock.length, emoji: '⚠️' }] : []),
        ]}
      />

      <QuickActionsGrid actions={[
        { to: '/sales/add',    emoji: '💰', label: 'Record Sale',   primary: true },
        { to: '/products',     emoji: '📦', label: 'Stock & Items' },
        { to: '/cashbook',     emoji: '📖', label: 'Cashbook' },
        { to: '/customers',    emoji: '👥', label: 'Customers' },
        { to: '/expenses/add', emoji: '💸', label: 'Add Expense' },
        { to: '/reports',      emoji: '📊', label: 'Reports' },
      ]} />

      {/* Low stock alert */}
      {lowStock && lowStock.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'var(--warning)', background: 'var(--warning-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#92400E', fontWeight: 700 }}>
            ⚠️ {lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low
          </div>
          {lowStock.slice(0, 3).map(p => (
            <div key={p.id} style={{ fontSize: '0.875rem', color: '#92400E' }}>
              • {p.name} — {p.stock_qty} {p.unit ?? 'units'} left
            </div>
          ))}
          <Link to="/products" style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, display: 'block', marginTop: '0.5rem', textDecoration: 'none' }}>
            Manage stock →
          </Link>
        </div>
      )}

      {/* Recent sales */}
      <div className="card" style={{ marginBottom: '5rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.875rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Recent Sales</h3>
          <Link to="/sales" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {!recentSales || recentSales.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="empty-icon">🧾</span>
            <p className="empty-title">No sales yet</p>
            <Link to="/sales/add" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              Record First Sale
            </Link>
          </div>
        ) : recentSales.map(sale => (
          <div key={sale.id} className="tx-item">
            <div className="tx-icon" style={{ background: 'var(--success-light)' }}><span>💰</span></div>
            <div className="tx-info">
              <div className="tx-name">{sale.receipt_no ? `#${sale.receipt_no}` : 'Sale'}</div>
              <div className="tx-meta">{formatRelative(sale.created_at)} · {sale.payment_method.replace(/_/g, ' ')}</div>
            </div>
            <div className="tx-amount income">{formatCurrency(sale.total)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
