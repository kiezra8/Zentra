import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Phone, MapPin, Plus, DollarSign } from 'lucide-react'
import { db } from '@/database/dexie'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/date'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [payAmount, setPayAmount] = useState('')
  const [showPayModal, setShowPayModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const customer = useLiveQuery(async () => {
    if (!id) return null
    return db.customers.get(id)
  }, [id])

  const sales = useLiveQuery(async () => {
    if (!id) return []
    return db.sales
      .where('customer_id').equals(id)
      .filter(s => !s.deleted_at)
      .reverse()
      .toArray()
  }, [id])

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!customer || !payAmount) return
    setLoading(true)

    const payment = parseFloat(payAmount)
    const newBalance = Math.max(0, customer.credit_balance - payment)

    await db.customers.update(customer.id, {
      credit_balance: newBalance,
      updated_at: Date.now(),
      sync_status: 'pending',
    })

    setPayAmount('')
    setShowPayModal(false)
    setLoading(false)
  }

  if (!customer) return null

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm btn-icon">
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ fontSize: '1.25rem' }}>{customer.name}</h2>
      </div>

      {/* Overview Card */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {customer.name[0]?.toUpperCase()}
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem' }}>{customer.name}</h3>
            {customer.phone && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={13} /> {customer.phone}
              </p>
            )}
            {customer.address && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} /> {customer.address}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Credit Owed</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: customer.credit_balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {formatCurrency(customer.credit_balance)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button onClick={() => setShowPayModal(true)} className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>
              Record Payment
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Purchase History</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!sales?.length ? (
          <div className="empty-state">
            <span className="empty-icon">🧾</span>
            <p className="empty-title">No purchases recorded</p>
          </div>
        ) : (
          sales.map((s, i) => (
            <div key={s.id} style={{ padding: '1rem 1.25rem', borderBottom: i < sales.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{s.receipt_no ? `Sale #${s.receipt_no}` : 'Sale'}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formatDateTime(s.created_at)}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                {formatCurrency(s.total)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Record Payment Modal */}
      {showPayModal && (
        <div className="modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '1rem' }}>Record Debt Payment</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Current balance owed: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(customer.credit_balance)}</strong>
            </p>
            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="pay-amt">Payment Amount (UGX)</label>
                <input id="pay-amt" type="number" inputMode="numeric" className="input" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} required autoFocus />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Saving…' : 'Clear Debt'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
