// Service & Beauty Dashboard — Salon, Barber, Repairs, Cleaning
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative, startOfDay, endOfDay } from '@/utils/date'
import { ProfitCard, QuickActionsGrid } from '@/components/dashboard/DashboardShell'
import { BUSINESS_CATEGORIES } from '@/types/business'

export default function ServiceDashboard() {
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

  const recentSales = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.sales.where('business_id').equals(activeBusiness.id)
      .filter(x => !x.deleted_at).reverse().limit(8).toArray()
  }, [activeBusiness?.id])

  const income = todaySales?.reduce((s, t) => s + t.total, 0) ?? 0
  const expenses = todayExpenses?.reduce((s, t) => s + t.amount, 0) ?? 0

  if (!activeBusiness) return null

  return (
    <div className="page-container">
      <ProfitCard
        income={income} expenses={expenses}
        businessName={activeBusiness.name}
        businessEmoji={catConfig?.emoji ?? '💇'}
        extraStats={[
          { label: 'Services Today', value: todaySales?.length ?? 0, emoji: '✂️' },
        ]}
      />

      <QuickActionsGrid actions={[
        { to: '/sales/add',    emoji: '💰', label: 'Record Service',  primary: true },
        { to: '/customers',    emoji: '👥', label: 'Customers' },
        { to: '/products',     emoji: '🛍️', label: 'Services/Stock' },
        { to: '/cashbook',     emoji: '📖', label: 'Cashbook' },
        { to: '/expenses/add', emoji: '💸', label: 'Add Expense' },
        { to: '/reports',      emoji: '📊', label: 'Reports' },
      ]} />

      <div className="card" style={{ marginBottom: '5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.875rem' }}>Recent Services</h3>
        {!recentSales || recentSales.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="empty-icon">{catConfig?.emoji ?? '💇'}</span>
            <p className="empty-title">No services recorded yet</p>
            <Link to="/sales/add" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              Record Service
            </Link>
          </div>
        ) : recentSales.map(sale => (
          <div key={sale.id} className="tx-item">
            <div className="tx-icon" style={{ background: '#FDF4FF' }}><span>{catConfig?.emoji ?? '✂️'}</span></div>
            <div className="tx-info">
              <div className="tx-name">{sale.receipt_no ? `Service #${sale.receipt_no}` : 'Service'}</div>
              <div className="tx-meta">{formatRelative(sale.created_at)} · {sale.payment_method.replace(/_/g, ' ')}</div>
            </div>
            <div className="tx-amount income">{formatCurrency(sale.total)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
