import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, Edit3, Lock, Check } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative, formatDateTime, startOfDay, endOfDay, startOfWeek, startOfMonth } from '@/utils/date'
import type { Sale } from '@/types'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/business'

type Period = 'today' | 'week' | 'month' | 'all'

const PERIOD_RANGES: Record<Period, [number, number]> = {
  today: [startOfDay(), endOfDay()],
  week: [startOfWeek(), endOfDay()],
  month: [startOfMonth(), endOfDay()],
  all: [0, Infinity],
}

export default function SalesListPage() {
  const { activeBusiness } = useBusinessStore()
  const [period, setPeriod] = useState<Period>('today')
  const [search, setSearch] = useState('')

  // Edit Modal State (24-Hour Edit Window)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [editTotal, setEditTotal] = useState('')
  const [editMethod, setEditMethod] = useState<PaymentMethod>('cash')
  const [editNotes, setEditNotes] = useState('')

  const [rangeStart, rangeEnd] = PERIOD_RANGES[period]
  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000

  const sales = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.sales
      .where('business_id').equals(activeBusiness.id)
      .filter(s =>
        !s.deleted_at &&
        (period === 'all' || (s.created_at >= rangeStart && s.created_at <= rangeEnd))
      )
      .reverse()
      .toArray()
  }, [activeBusiness?.id, period])

  const filtered = (sales ?? []).filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (s.receipt_no ?? '').toLowerCase().includes(q) ||
      (s.notes ?? '').toLowerCase().includes(q) ||
      s.payment_method.includes(q)
    )
  })

  const total = filtered.reduce((sum, s) => sum + s.total, 0)

  function handleOpenEdit(sale: Sale) {
    // 24-hour edit lock check
    if (now - sale.created_at > oneDayMs) {
      alert('This transaction is older than 24 hours and cannot be edited to maintain accounting integrity.')
      return
    }
    setEditingSale(sale)
    setEditTotal(sale.total.toString())
    setEditMethod(sale.payment_method)
    setEditNotes(sale.notes || '')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSale) return

    const newTotal = parseFloat(editTotal)
    await db.sales.update(editingSale.id, {
      total: newTotal,
      subtotal: newTotal,
      payment_method: editMethod,
      notes: editNotes.trim() || undefined,
      updated_at: Date.now(),
      sync_status: 'pending',
    })

    setEditingSale(null)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <h2>Sales</h2>
        <Link to="/sales/add" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', gap: '0.375rem' }}>
          <Plus size={16} /> Add Sale
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
        <input type="search" className="input" placeholder="Search sales…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.75rem' }} />
      </div>

      {/* Summary */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'var(--success-light)', border: '1px solid var(--success)' }}>
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--success)' }}>{period === 'all' ? 'Total' : period.charAt(0).toUpperCase() + period.slice(1)} Revenue</p>
          <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(total)}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{filtered.length} sales</p>
        </div>
      </div>

      {/* Sales list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!filtered.length ? (
          <div className="empty-state">
            <span className="empty-icon">🧾</span>
            <p className="empty-title">No sales yet</p>
            <p className="empty-desc">Tap "Add Sale" to record your first transaction</p>
            <Link to="/sales/add" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.75rem' }}>
              <Plus size={16} /> Record Sale
            </Link>
          </div>
        ) : (
          filtered.map((sale, i) => {
            const isEditable = now - sale.created_at <= oneDayMs

            return (
              <div key={sale.id} style={{ padding: '1rem 1.25rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                  💰
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {sale.receipt_no ? `Sale #${sale.receipt_no}` : 'Sale'}
                    {!isEditable && (
                      <span className="badge badge-muted" title="Transactions older than 24 hours cannot be edited">
                        <Lock size={10} /> 24h Locked
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    <span>{formatRelative(sale.created_at)}</span>
                    <span>•</span>
                    <span style={{ textTransform: 'capitalize' }}>{sale.payment_method.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                    {formatCurrency(sale.total)}
                  </div>

                  {isEditable ? (
                    <button
                      onClick={() => handleOpenEdit(sale)}
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

      {/* 24-Hour Edit Modal */}
      {editingSale && (
        <div className="modal-backdrop" onClick={() => setEditingSale(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '0.5rem' }}>Edit Recent Sale</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Editable within 24 hours of creation ({formatDateTime(editingSale.created_at)})
            </p>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="edit-amt">Sale Amount (UGX)</label>
                <input id="edit-amt" type="number" inputMode="numeric" className="input" value={editTotal} onChange={e => setEditTotal(e.target.value)} required autoFocus />
              </div>

              <div className="input-group">
                <label className="input-label">Payment Method</label>
                <select className="input" value={editMethod} onChange={e => setEditMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map(pm => (
                    <option key={pm.value} value={pm.value}>{pm.emoji} {pm.label}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="edit-notes">Notes</label>
                <input id="edit-notes" type="text" className="input" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Reason for edit…" />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setEditingSale(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
