import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Phone, MapPin, CheckCircle2, DollarSign, ArrowDownLeft } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/date'
import { generateId } from '@/utils/deviceId'
import type { CashTransaction } from '@/types'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [payAmount, setPayAmount] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [showPayModal, setShowPayModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const customer = useLiveQuery(async () => {
    if (!id) return null
    return db.customers.get(id)
  }, [id])

  // Payment history from cash transactions
  const payments = useLiveQuery(async () => {
    if (!id || !customer) return []
    return db.cashTransactions
      .where('business_id').equals(customer.business_id)
      .filter(t => t.reference === id && !t.deleted_at)
      .reverse()
      .toArray()
  }, [id, customer?.business_id])

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
    const newPaidTotal = (customer.total_paid || 0) + payment
    const newRemainingBalance = Math.max(0, customer.credit_balance - payment)
    const now = Date.now()

    // 1. Update Customer Record
    await db.customers.update(customer.id, {
      total_paid: newPaidTotal,
      credit_balance: newRemainingBalance,
      updated_at: now,
      sync_status: 'pending',
    })

    // 2. Record Cash In Transaction in Cashbook
    const tx: CashTransaction = {
      id: generateId(),
      business_id: customer.business_id,
      type: 'in',
      amount: payment,
      description: `Debt Payment from ${customer.name}${payNotes ? ` (${payNotes})` : ''}`,
      payment_method: 'cash',
      reference: customer.id,
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }
    await db.cashTransactions.add(tx)

    setPayAmount('')
    setPayNotes('')
    setShowPayModal(false)
    setLoading(false)
  }

  if (!customer) return null

  const isCleared = customer.credit_balance <= 0

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm btn-icon">
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ fontSize: '1.25rem' }}>{customer.name}</h2>
      </div>

      {/* Customer Info Card */}
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

        {/* Cleared vs Owes Banner */}
        {isCleared ? (
          <div style={{ background: 'var(--success-light)', border: '1px solid var(--success)', borderRadius: 12, padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, marginBottom: '1rem' }}>
            <CheckCircle2 size={20} />
            <span>Debt Fully Paid & Cleared!</span>
          </div>
        ) : (
          <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Remaining Balance Owed</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(customer.credit_balance)}</p>
            </div>
            <button onClick={() => setShowPayModal(true)} className="btn btn-primary btn-sm">
              Record Payment
            </button>
          </div>
        )}

        {/* Debt Breakdown Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial Debt</p>
            <p style={{ fontSize: '1rem', fontWeight: 700 }}>{formatCurrency(customer.initial_debt || 0)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Paid</p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(customer.total_paid || 0)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Remaining</p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: isCleared ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(customer.credit_balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Payment History</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        {!payments?.length ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p className="empty-title">No debt payments logged yet</p>
          </div>
        ) : (
          payments.map((p, i) => (
            <div key={p.id} style={{ padding: '1rem 1.25rem', borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowDownLeft size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(p.created_at)}</div>
                </div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                +{formatCurrency(p.amount)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sales History */}
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Purchase History</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!sales?.length ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
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
            <h3 style={{ marginBottom: '0.5rem' }}>Record Debt Payment</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Current balance owed: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(customer.credit_balance)}</strong>
            </p>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="pay-amt">Amount Paid (UGX)</label>
                <input id="pay-amt" type="number" inputMode="numeric" className="input" placeholder="e.g. 20000" value={payAmount} onChange={e => setPayAmount(e.target.value)} required autoFocus style={{ fontSize: '1.25rem', fontWeight: 700 }} />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="pay-notes">Notes / Reference <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input id="pay-notes" type="text" className="input" placeholder="e.g. Cash payment part 1" value={payNotes} onChange={e => setPayNotes(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Saving…' : 'Save Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
