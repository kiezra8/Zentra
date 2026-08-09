import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency, formatCompact } from '@/utils/currency'
import { startOfDay, endOfDay, startOfWeek, startOfMonth } from '@/utils/date'

type Period = 'today' | 'week' | 'month'

export default function ReportsPage() {
  const { activeBusiness } = useBusinessStore()
  const [period, setPeriod] = useState<Period>('month')

  const rangeStart = period === 'today' ? startOfDay() : period === 'week' ? startOfWeek() : startOfMonth()
  const rangeEnd = endOfDay()

  const sales = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.sales
      .where('business_id').equals(activeBusiness.id)
      .filter(s => !s.deleted_at && s.created_at >= rangeStart && s.created_at <= rangeEnd)
      .toArray()
  }, [activeBusiness?.id, rangeStart])

  const expenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses
      .where('business_id').equals(activeBusiness.id)
      .filter(e => !e.deleted_at && e.created_at >= rangeStart && e.created_at <= rangeEnd)
      .toArray()
  }, [activeBusiness?.id, rangeStart])

  const totalRevenue = (sales ?? []).reduce((s, x) => s + x.total, 0)
  const totalExpenses = (expenses ?? []).reduce((s, x) => s + x.amount, 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'

  // Group expenses by category
  const expenseByCategory: Record<string, number> = {}
  for (const e of expenses ?? []) {
    expenseByCategory[e.category_name] = (expenseByCategory[e.category_name] || 0) + e.amount
  }
  const topExpenseCategories = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])

  function exportCSV() {
    if (!sales) return
    const headers = 'ID,Date,Total,Payment Method\n'
    const rows = sales.map(s => `${s.id},${new Date(s.created_at).toISOString()},${s.total},${s.payment_method}`).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Zentra_Sales_Report_${period}.csv`
    a.click()
  }

  return (
    <div className="page-container">
      {/* Title */}
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>Business Reports</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Financial summary & insights</p>
        </div>
        <button onClick={exportCSV} className="btn btn-secondary btn-sm" style={{ gap: '0.375rem' }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Period Selector */}
      <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
        {(['today', 'week', 'month'] as Period[]).map(p => (
          <button key={p} className={`tab-item ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {/* Hero Financial Summary Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem', background: 'var(--surface)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total Revenue</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total Expenses</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)', marginTop: 2 }}>
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Net Profit</p>
            <p style={{ fontSize: '1.375rem', fontWeight: 800, color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(netProfit)}
            </p>
          </div>
          <div className={`badge ${netProfit >= 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}>
            Margin: {profitMargin}%
          </div>
        </div>
      </div>

      {/* Visual Bar Comparison */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Revenue vs Expenses</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div className="flex-between" style={{ fontSize: '0.875rem', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>Revenue</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${Math.min(100, totalRevenue > 0 ? 100 : 0)}%`, background: 'var(--success)' }} />
            </div>
          </div>

          <div>
            <div className="flex-between" style={{ fontSize: '0.875rem', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Expenses</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${Math.min(100, totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0)}%`, background: 'var(--danger)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Top Expense Categories Breakdown */}
      <div className="card" style={{ marginBottom: '5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Cost Breakdown</h3>
        {!topExpenseCategories.length ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>No expenses recorded for this period.</p>
        ) : (
          topExpenseCategories.map(([cat, amt]) => {
            const pct = totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(0) : '0'
            return (
              <div key={cat} style={{ marginBottom: '0.875rem' }}>
                <div className="flex-between" style={{ fontSize: '0.875rem', marginBottom: 4 }}>
                  <span>{cat}</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(amt)} ({pct}%)</span>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
