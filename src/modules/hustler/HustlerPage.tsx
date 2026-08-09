import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, DollarSign, Sparkles, TrendingUp } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatTime, startOfDay, endOfDay } from '@/utils/date'
import { generateId } from '@/utils/deviceId'
import type { IncomeEntry } from '@/types'

const HUSTLE_SOURCES = [
  'Selling Clothes', 'Casual Work', 'Delivery / Errands',
  'Hairdressing / Beauty', 'Food & Snacks', 'Freelance / Online',
  'Repairs / Technical', 'Other Hustle'
]

export default function HustlerPage() {
  const { activeBusiness } = useBusinessStore()
  const [showModal, setShowModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState(HUSTLE_SOURCES[0])
  const [loading, setLoading] = useState(false)

  const todayStart = startOfDay()
  const todayEnd = endOfDay()

  const incomeEntries = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.incomeEntries
      .where('business_id').equals(activeBusiness.id)
      .filter(i => !i.deleted_at && i.created_at >= todayStart && i.created_at <= todayEnd)
      .reverse()
      .toArray()
  }, [activeBusiness?.id, todayStart])

  const expenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses
      .where('business_id').equals(activeBusiness.id)
      .filter(e => !e.deleted_at && e.created_at >= todayStart && e.created_at <= todayEnd)
      .toArray()
  }, [activeBusiness?.id, todayStart])

  const totalIncome = (incomeEntries ?? []).reduce((s, x) => s + x.amount, 0)
  const totalExpenses = (expenses ?? []).reduce((s, x) => s + x.amount, 0)
  const netEarnings = totalIncome - totalExpenses

  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusiness || !amount) return
    setLoading(true)

    const now = Date.now()
    const entry: IncomeEntry = {
      id: generateId(),
      business_id: activeBusiness.id,
      description: description.trim() || source,
      amount: parseFloat(amount),
      source,
      payment_method: 'cash',
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }

    await db.incomeEntries.add(entry)
    setAmount('')
    setDescription('')
    setShowModal(false)
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>Muyilibi / Hustler Tracker</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>"What did I make today?"</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
          <Plus size={16} /> Add Income
        </button>
      </div>

      {/* Main Earnings Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', border: 'none', borderRadius: 20, boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Sparkles size={18} />
          <span style={{ fontSize: '0.875rem', opacity: 0.85 }}>Today's Net Earnings</span>
        </div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
          {formatCurrency(netEarnings)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', opacity: 0.75 }}>Total Income (+)</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>{formatCurrency(totalIncome)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', opacity: 0.75 }}>Today's Costs (-)</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#FCA5A5' }}>{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Today's Income List */}
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Today's Money In</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!incomeEntries?.length ? (
          <div className="empty-state">
            <span className="empty-icon">🧑‍💼</span>
            <p className="empty-title">No income logged today</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
              <Plus size={16} /> Log Today's Hustle
            </button>
          </div>
        ) : (
          incomeEntries.map((item, i) => (
            <div key={item.id} style={{ padding: '1rem 1.25rem', borderBottom: i < incomeEntries.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                💵
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.description}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formatTime(item.created_at)} • {item.source}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                +{formatCurrency(item.amount)}
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
            <h3 style={{ marginBottom: '1rem' }}>Log Income</h3>
            <form onSubmit={handleAddIncome} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="hustle-amt">Amount Received (UGX)</label>
                <input id="hustle-amt" type="number" inputMode="numeric" className="input" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus style={{ fontSize: '1.25rem', fontWeight: 700 }} />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="hustle-source">Hustle Category</label>
                <select id="hustle-source" className="input" value={source} onChange={e => setSource(e.target.value)}>
                  {HUSTLE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="hustle-desc">What did you do / sell?</label>
                <input id="hustle-desc" type="text" className="input" placeholder="e.g. Sold 2 jackets, fixed phone screen…" value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Saving…' : 'Save Income'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
