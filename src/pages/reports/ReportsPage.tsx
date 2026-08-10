import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, Package } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency, formatCompact } from '@/utils/currency'
import { startOfDay, endOfDay, startOfWeek, startOfMonth } from '@/utils/date'

type Period = 'today' | 'week' | 'month' | 'year' | 'all'

function startOfYear(): number {
  const d = new Date()
  d.setMonth(0, 1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export default function ReportsPage() {
  const { activeBusiness } = useBusinessStore()
  const [period, setPeriod] = useState<Period>('month')

  const rangeStart =
    period === 'today' ? startOfDay() :
    period === 'week' ? startOfWeek() :
    period === 'month' ? startOfMonth() :
    period === 'year' ? startOfYear() : 0

  const rangeEnd = endOfDay()

  // Live queries
  const sales = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.sales
      .where('business_id').equals(activeBusiness.id)
      .filter(s => !s.deleted_at && (period === 'all' || (s.created_at >= rangeStart && s.created_at <= rangeEnd)))
      .toArray()
  }, [activeBusiness?.id, rangeStart, period])

  const saleItems = useLiveQuery(async () => {
    if (!sales || sales.length === 0) return []
    const saleIds = sales.map(s => s.id)
    return db.saleItems.filter(item => saleIds.includes(item.sale_id)).toArray()
  }, [sales])

  const expenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses
      .where('business_id').equals(activeBusiness.id)
      .filter(e => !e.deleted_at && (period === 'all' || (e.created_at >= rangeStart && e.created_at <= rangeEnd)))
      .toArray()
  }, [activeBusiness?.id, rangeStart, period])

  const totalRevenue = (sales ?? []).reduce((s, x) => s + x.total, 0)
  const totalExpenses = (expenses ?? []).reduce((s, x) => s + x.amount, 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'

  // Per-Product Sales Analysis
  const productStatsMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
  for (const item of saleItems ?? []) {
    const key = item.name
    if (!productStatsMap[key]) {
      productStatsMap[key] = { name: item.name, quantity: 0, revenue: 0 }
    }
    productStatsMap[key].quantity += item.quantity
    productStatsMap[key].revenue += item.total
  }
  const productPerformance = Object.values(productStatsMap).sort((a, b) => b.revenue - a.revenue)

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
    a.download = `Zentra_${period.toUpperCase()}_Report.csv`
    a.click()
  }

  return (
    <div className="page-container">
      {/* Title */}
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>Business Reports</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Financial summary & product analytics</p>
        </div>
        <button onClick={exportCSV} className="btn btn-secondary btn-sm" style={{ gap: '0.375rem' }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Separated Period Selector: Today / Week / Month / Year / All */}
      <div className="tab-bar" style={{ marginBottom: '1.25rem', overflowX: 'auto' }}>
        {(['today', 'week', 'month', 'year', 'all'] as Period[]).map(p => (
          <button key={p} className={`tab-item ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : 'All Time'}
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

      {/* Per-Product Sales Analytics */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={18} style={{ color: 'var(--primary)' }} /> Product Sales Performance ({period.toUpperCase()})
        </h3>

        {!productPerformance.length ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
            No product-specific sales recorded in this period.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem 0' }}>Product</th>
                  <th style={{ padding: '0.5rem 0', textAlign: 'center' }}>Units Sold</th>
                  <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {productPerformance.map((prod, i) => (
                  <tr key={i} style={{ borderBottom: i < productPerformance.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 600 }}>{prod.name}</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'center', fontWeight: 700 }}>{prod.quantity}</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                      {formatCurrency(prod.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="card" style={{ marginBottom: '5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Cost Breakdown ({period.toUpperCase()})</h3>
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
