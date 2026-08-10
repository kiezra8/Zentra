import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, Edit3, Lock } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative, formatDateTime, startOfDay, endOfDay, startOfWeek, startOfMonth } from '@/utils/date'
import { EXPENSE_CATEGORIES } from '@/types'
import type { Expense } from '@/types'

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

  // Edit Modal State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState(EXPENSE_CATEGORIES[0].name)
  const [editDesc, setEditDesc] = useState('')

  const [rangeStart, rangeEnd] = PERIOD_RANGES[period]
  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000

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

  function handleOpenEdit(exp: Expense) {
    if (now - exp.created_at > oneDayMs) {
      alert('This expense is older than 24 hours and cannot be edited.')
      return
    }
    setEditingExpense(exp)
    setEditAmount(exp.amount.toString())
    setEditCategory(exp.category_name)
    setEditDesc(exp.description || '')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingExpense) return

    await db.expenses.update(editingExpense.id, {
      amount: parseFloat(editAmount),
      category_name: editCategory,
      description: editDesc.trim() || undefined,
      updated_at: Date.now(),
      sync_status: 'pending',
    })

    setEditingExpense(null)
  }

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
            const isEditable = now - expense.created_at <= oneDayMs

            return (
              <div key={expense.id} style={{ padding: '1rem 1.25rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                  {emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {expense.category_name}
                    {!isEditable && (
                      <span className="badge badge-muted" title="Locked after 24h">
                        <Lock size={10} /> 24h Locked
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    <span>{formatRelative(expense.created_at)}</span>
                    {expense.description && (
                      <>
                        <span>•</span>
                        <span>{expense.description}</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                    -{formatCurrency(expense.amount)}
                  </div>
                  {isEditable ? (
                    <button
                      onClick={() => handleOpenEdit(expense)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4 }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                      <Lock size={11} /> Fixed
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingExpense && (
        <div className="modal-backdrop" onClick={() => setEditingExpense(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '0.5rem' }}>Edit Expense</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Editable within 24 hours ({formatDateTime(editingExpense.created_at)})
            </p>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="exp-edit-amt">Amount (UGX)</label>
                <input id="exp-edit-amt" type="number" inputMode="numeric" className="input" value={editAmount} onChange={e => setEditAmount(e.target.value)} required autoFocus />
              </div>

              <div className="input-group">
                <label className="input-label">Category</label>
                <select className="input" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="exp-edit-desc">Description</label>
                <input id="exp-edit-desc" type="text" className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Reason for expense…" />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setEditingExpense(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
