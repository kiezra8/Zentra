// Hustler / Side-hustle Dashboard
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative, startOfDay, endOfDay } from '@/utils/date'
import { ProfitCard, QuickActionsGrid } from '@/components/dashboard/DashboardShell'

export default function HustlerDashboard() {
  const { activeBusiness } = useBusinessStore()
  const s = startOfDay(), e = endOfDay()

  const todayIncome = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.incomeEntries.where('business_id').equals(activeBusiness.id)
      .filter(x => x.created_at >= s && x.created_at <= e && !x.deleted_at).toArray()
  }, [activeBusiness?.id])

  const todayExpenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses.where('business_id').equals(activeBusiness.id)
      .filter(x => x.created_at >= s && x.created_at <= e && !x.deleted_at).toArray()
  }, [activeBusiness?.id])

  const recentIncome = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.incomeEntries.where('business_id').equals(activeBusiness.id)
      .filter(x => !x.deleted_at).reverse().limit(8).toArray()
  }, [activeBusiness?.id])

  const income = todayIncome?.reduce((s, t) => s + t.amount, 0) ?? 0
  const expenses = todayExpenses?.reduce((s, t) => s + t.amount, 0) ?? 0

  if (!activeBusiness) return null

  return (
    <div className="page-container">
      <ProfitCard
        income={income} expenses={expenses}
        businessName={activeBusiness.name}
        businessEmoji="🧑‍💼"
        extraStats={[{ label: 'Income Entries', value: todayIncome?.length ?? 0, emoji: '💵' }]}
      />

      <QuickActionsGrid actions={[
        { to: '/hustler',      emoji: '💵', label: 'Add Income',   primary: true },
        { to: '/expenses/add', emoji: '💸', label: 'Add Expense' },
        { to: '/cashbook',     emoji: '📖', label: 'Cashbook' },
        { to: '/reports',      emoji: '📊', label: 'Reports' },
      ]} />

      <div className="card" style={{ marginBottom: '5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.875rem' }}>Recent Income</h3>
        {!recentIncome || recentIncome.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="empty-icon">💵</span>
            <p className="empty-title">No income recorded yet</p>
            <Link to="/hustler" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              Add Income
            </Link>
          </div>
        ) : recentIncome.map(entry => (
          <div key={entry.id} className="tx-item">
            <div className="tx-icon" style={{ background: 'var(--success-light)' }}><span>💵</span></div>
            <div className="tx-info">
              <div className="tx-name">{entry.description}</div>
              <div className="tx-meta">{formatRelative(entry.created_at)} {entry.source ? `· ${entry.source}` : ''}</div>
            </div>
            <div className="tx-amount income">{formatCurrency(entry.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
