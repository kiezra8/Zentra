import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet, CheckCircle } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime, startOfDay, endOfDay, startOfWeek, startOfMonth } from '@/utils/date'
import { generateId } from '@/utils/deviceId'
import type { CashTransaction } from '@/types'

type Period = 'today' | 'week' | 'month'

export default function CashbookPage() {
  const { activeBusiness } = useBusinessStore()
  const [period, setPeriod] = useState<Period>('today')
  const [showModal, setShowModal] = useState(false)
  const [txType, setTxType] = useState<'in' | 'out'>('in')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const rangeStart = period === 'today' ? startOfDay() : period === 'week' ? startOfWeek() : startOfMonth()
  const rangeEnd = endOfDay()

  // Live queries
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

  const manualTx = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.cashTransactions
      .where('business_id').equals(activeBusiness.id)
      .filter(t => !t.deleted_at && t.created_at >= rangeStart && t.created_at <= rangeEnd)
      .reverse()
      .toArray()
  }, [activeBusiness?.id, rangeStart])

  const totalSalesIncome = (sales ?? []).reduce((s, x) => s + x.total, 0)
  const totalManualIn = (manualTx ?? []).filter(t => t.type === 'in').reduce((s, x) => s + x.amount, 0)
  const moneyReceived = totalSalesIncome + totalManualIn

  const totalExpensesOut = (expenses ?? []).reduce((s, x) => s + x.amount, 0)
  const totalManualOut = (manualTx ?? []).filter(t => t.type === 'out').reduce((s, x) => s + x.amount, 0)
  const moneySpent = totalExpensesOut + totalManualOut

  const netBalance = moneyReceived - moneySpent

  async function handleAddManualTx(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusiness || !amount || !description) return
    setLoading(true)

    const now = Date.now()
    const tx: CashTransaction = {
      id: generateId(),
      business_id: activeBusiness.id,
      type: txType,
      amount: parseFloat(amount),
      description: description.trim(),
      payment_method: 'cash',
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }

    await db.cashTransactions.add(tx)
    setAmount('')
    setDescription('')
    setShowModal(false)
    setLoading(false)
  }

  return (
    <div className="page-container">
      {/* Title */}
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>Digital Cashbook</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Track cash in and cash out</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
          <Plus size={16} /> Cash Entry
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

      {/* Hero Summary Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          <Wallet size={18} /> Expected Net Cash Balance
        </div>
        <div style={{ fontSize: '2.25rem', fontWeight: 800, color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)', marginBottom: '1.25rem' }}>
          {formatCurrency(netBalance)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}>
              <ArrowDownLeft size={16} /> Money Received (+)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 4 }}>
              {formatCurrency(moneyReceived)}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--danger)', fontWeight: 600 }}>
              <ArrowUpRight size={16} /> Money Spent (-)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 4 }}>
              {formatCurrency(moneySpent)}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Transactions List */}
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Manual Cash Adjustments</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!manualTx?.length ? (
          <div className="empty-state">
            <span className="empty-icon">📖</span>
            <p className="empty-title">No manual cash entries</p>
            <p className="empty-desc">Sales and expenses update cash automatically. Tap "Cash Entry" for manual additions/drawings.</p>
          </div>
        ) : (
          manualTx.map((t, i) => (
            <div key={t.id} style={{ padding: '1rem 1.25rem', borderBottom: i < manualTx.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: t.type === 'in' ? 'var(--success-light)' : 'var(--danger-light)',
                color: t.type === 'in' ? 'var(--success)' : 'var(--danger)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {t.type === 'in' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{t.description}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formatDateTime(t.created_at)}</div>
              </div>
              <div style={{ fontWeight: 700, color: t.type === 'in' ? 'var(--success)' : 'var(--danger)' }}>
                {t.type === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '1rem' }}>Record Cash Entry</h3>

            <form onSubmit={handleAddManualTx} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="tab-bar">
                <button type="button" className={`tab-item ${txType === 'in' ? 'active' : ''}`} onClick={() => setTxType('in')} style={{ color: txType === 'in' ? 'var(--success)' : undefined }}>
                  💵 Cash In (+)
                </button>
                <button type="button" className={`tab-item ${txType === 'out' ? 'active' : ''}`} onClick={() => setTxType('out')} style={{ color: txType === 'out' ? 'var(--danger)' : undefined }}>
                  💸 Cash Out (-)
                </button>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="cash-amt">Amount (UGX)</label>
                <input id="cash-amt" type="number" inputMode="numeric" className="input" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="cash-desc">Description / Reason</label>
                <input id="cash-desc" type="text" className="input" placeholder="e.g. Owner capital injection, Personal draw…" value={description} onChange={e => setDescription(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Saving…' : 'Save Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
