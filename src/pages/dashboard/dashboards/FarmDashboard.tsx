// Farm Dashboard
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative, startOfDay, endOfDay } from '@/utils/date'
import { ProfitCard, QuickActionsGrid } from '@/components/dashboard/DashboardShell'

export default function FarmDashboard() {
  const { activeBusiness } = useBusinessStore()
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

  const recentSales = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.sales.where('business_id').equals(activeBusiness.id)
      .filter(x => !x.deleted_at).reverse().limit(6).toArray()
  }, [activeBusiness?.id])

  const income = todaySales?.reduce((s, t) => s + t.total, 0) ?? 0
  const expenses = todayExpenses?.reduce((s, t) => s + t.amount, 0) ?? 0

  if (!activeBusiness) return null

  return (
    <div className="page-container">
      <ProfitCard
        income={income} expenses={expenses}
        businessName={activeBusiness.name}
        businessEmoji="🌾"
        extraStats={[{ label: 'Sales Today', value: todaySales?.length ?? 0, emoji: '🌾' }]}
      />

      <QuickActionsGrid actions={[
        { to: '/sales/add',    emoji: '🌾', label: 'Record Sale',   primary: true },
        { to: '/products',     emoji: '📦', label: 'Stock/Harvest' },
        { to: '/expenses/add', emoji: '🌱', label: 'Farm Expense' },
        { to: '/customers',    emoji: '👥', label: 'Buyers' },
        { to: '/cashbook',     emoji: '📖', label: 'Cashbook' },
        { to: '/reports',      emoji: '📊', label: 'Reports' },
      ]} />

      <div className="card" style={{ marginBottom: '5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.875rem' }}>Recent Sales</h3>
        {!recentSales || recentSales.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="empty-icon">🌾</span>
            <p className="empty-title">No sales recorded yet</p>
            <Link to="/sales/add" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              Record Harvest Sale
            </Link>
          </div>
        ) : recentSales.map(sale => (
          <div key={sale.id} className="tx-item">
            <div className="tx-icon" style={{ background: '#F0FDF4' }}><span>🌾</span></div>
            <div className="tx-info">
              <div className="tx-name">{sale.receipt_no ? `Sale #${sale.receipt_no}` : 'Farm Sale'}</div>
              <div className="tx-meta">{formatRelative(sale.created_at)}</div>
            </div>
            <div className="tx-amount income">{formatCurrency(sale.total)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
