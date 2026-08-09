import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative } from '@/utils/date'
import { startOfDay, endOfDay, startOfWeek, startOfMonth } from '@/utils/date'
import { EXPENSE_CATEGORIES } from '@/types'

type Period = 'today' | 'week' | 'month' | 'all'

const PERIOD_RANGES: Record<Period, [number, number]> = {
  today: [startOfDay(), endOfDay()],
  week: [startOfWeek(), endOfDay()],
  month: [startOfMonth(), endOfDay()],
  all: [0, Infinity],
}

export default function ExpensesListPage() {
  const { activeBusiness } = useBusinessStore()
  const [period, setPeriod] = useState<Period>('today')
  const [search, setSearch] = useState('')

  const [rangeStart, rangeEnd] = PERIOD_RANGES[period]

  const expenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses
      .where('business_id').equals(activeBusiness.id)
      .filter(e =>
        !e.deleted_at &&
        (period === 'all' || (e.created_at >= rangeStart && e.created_at <= rangeEnd))
      )
      .reverse()
      .toArray()
  }, [activeBusiness?.id, period])

  const filtered = (expenses ?? []).filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (e.category_name ?? '').toLowerCase().includes(q) ||
      (e.description ?? '').toLowerCase().includes(q) ||
      e.payment_method.includes(q)
    )
  })

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <h2>Expenses</h2>
        <Link to="/expenses/add" className="btn btn-danger btn-sm" style={{ textDecoration: 'none', gap: '0.375rem' }}>
          <Plus size={16} /> Add Expense
        </Link>
      </div>

      {/* Period tabs */}
      <div className="tab-bar" style={{ marginBottom: '1rem' }}>
        {(['today','week','month','all'] as Period[]).map(p => (
          <button key={p} className={`tab-item ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="search" className="input" placeholder="Search expenses…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.75rem' }} />
      </div>

      {/* Summary */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'var(--danger-light)', border: '1px solid var(--danger)' }}>
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--danger)' }}>{period === 'all' ? 'Total' : period.charAt(0).toUpperCase() + period.slice(1)} Expenses</p>
          <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(total)}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{filtered.length} entries</p>
        </div>
      </div>

      {/* Expenses list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!filtered.length ? (
          <div className="empty-state">
            <span className="empty-icon">💸</span>
            <p className="empty-title">No expenses logged</p>
            <p className="empty-desc">Tap "Add Expense" to track your business costs</p>
            <Link to="/expenses/add" className="btn btn-danger btn-sm" style={{ textDecoration: 'none', marginTop: '0.75rem' }}>
              <Plus size={16} /> Record Expense
            </Link>
          </div>
        ) : (
          filtered.map((expense, i) => {
            const catObj = EXPENSE_CATEGORIES.find(c => c.name === expense.category_name)
            const emoji = catObj?.emoji ?? '💸'
            return (
              <div key={expense.id} style={{ padding: '1rem 1.25rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                  {emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                    {expense.category_name}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span>{formatRelative(expense.created_at)}</span>
                    {expense.description && (
                      <>
                        <span>•</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{expense.description}</span>
                      </>
                    )}
                    {expense.sync_status === 'pending' && <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>⏳ pending</span>}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                  -{formatCurrency(expense.amount)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
