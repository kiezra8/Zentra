// Mobile Money & Bank Agent Dashboard
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency, formatCompact } from '@/utils/currency'
import { formatRelative, startOfDay, endOfDay } from '@/utils/date'
import { ProfitCard, QuickActionsGrid } from '@/components/dashboard/DashboardShell'
import { BUSINESS_CATEGORIES } from '@/types/business'

export default function MobileMoneyDashboard() {
  const { activeBusiness } = useBusinessStore()
  const catConfig = BUSINESS_CATEGORIES.find(c => c.id === activeBusiness?.category)
  const s = startOfDay(), e = endOfDay()

  const todayTxs = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.mobileMoneyTransactions.where('business_id').equals(activeBusiness.id)
      .filter(x => x.created_at >= s && x.created_at <= e && !x.deleted_at).toArray()
  }, [activeBusiness?.id])

  const todayExpenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses.where('business_id').equals(activeBusiness.id)
      .filter(x => x.created_at >= s && x.created_at <= e && !x.deleted_at).toArray()
  }, [activeBusiness?.id])

  const recentTxs = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.mobileMoneyTransactions.where('business_id').equals(activeBusiness.id)
      .filter(x => !x.deleted_at).reverse().limit(8).toArray()
  }, [activeBusiness?.id])

  const todayCommission = todayTxs?.reduce((s, t) => s + t.commission, 0) ?? 0
  const totalTx = todayTxs?.reduce((s, t) => s + t.amount, 0) ?? 0
  const expenses = todayExpenses?.reduce((s, t) => s + t.amount, 0) ?? 0

  if (!activeBusiness) return null

  return (
    <div className="page-container">
      <ProfitCard
        income={todayCommission} expenses={expenses}
        businessName={activeBusiness.name}
        businessEmoji={catConfig?.emoji ?? '💰'}
        extraStats={[
          { label: 'Transactions', value: todayTxs?.length ?? 0, emoji: '↔️' },
          { label: 'Total Volume', value: formatCompact(totalTx), emoji: '💵' },
        ]}
      />

      <QuickActionsGrid actions={[
        { to: '/mobile-money',     emoji: '💰', label: 'New Transaction', primary: true },
        { to: '/mobile-money',     emoji: '📥', label: 'Deposit' },
        { to: '/mobile-money',     emoji: '📤', label: 'Withdrawal' },
        { to: '/cashbook',         emoji: '📖', label: 'Cashbook' },
        { to: '/expenses/add',     emoji: '💸', label: 'Add Expense' },
        { to: '/reports',          emoji: '📊', label: 'Reports' },
      ]} />

      {/* Float summary */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.875rem' }}>Today's Commission</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {['mtn','airtel','bank','other'].map(net => {
            const netTxs = todayTxs?.filter(t => t.network === net) ?? []
            const comm = netTxs.reduce((s, t) => s + t.commission, 0)
            if (comm === 0 && netTxs.length === 0) return null
            return (
              <div key={net} className="card" style={{ padding: '0.875rem', borderRadius: 12 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{net}</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 2 }}>{formatCurrency(comm)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{netTxs.length} tx</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card" style={{ marginBottom: '5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.875rem' }}>Recent Transactions</h3>
        {!recentTxs || recentTxs.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="empty-icon">💸</span>
            <p className="empty-title">No transactions yet today</p>
            <Link to="/mobile-money" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              Record Transaction
            </Link>
          </div>
        ) : recentTxs.map(tx => (
          <div key={tx.id} className="tx-item">
            <div className="tx-icon" style={{ background: tx.type === 'deposit' ? 'var(--success-light)' : 'var(--danger-light)' }}>
              <span>{tx.type === 'deposit' ? '📥' : tx.type === 'withdrawal' ? '📤' : '↔️'}</span>
            </div>
            <div className="tx-info">
              <div className="tx-name">{tx.network.toUpperCase()} {tx.type}</div>
              <div className="tx-meta">{formatRelative(tx.created_at)} · Comm: {formatCurrency(tx.commission)}</div>
            </div>
            <div className="tx-amount income">{formatCurrency(tx.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
