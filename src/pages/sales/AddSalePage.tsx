import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ChevronDown, Info } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { generateId } from '@/utils/deviceId'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/business'
import type { Sale } from '@/types'

export default function AddSalePage() {
  const navigate = useNavigate()
  const { activeBusiness } = useBusinessStore()

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [discount, setDiscount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusiness || !amount) return
    setLoading(true)

    const total = parseFloat(amount) - parseFloat(discount || '0')
    const now = Date.now()
    const sale: Sale = {
      id: generateId(),
      business_id: activeBusiness.id,
      total: Math.max(0, total),
      subtotal: parseFloat(amount),
      discount: parseFloat(discount || '0'),
      tax: 0,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      receipt_no: `S${Date.now().toString().slice(-6)}`,
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }

    await db.sales.add(sale)
    setSaved(true)
    setTimeout(() => {
      navigate(-1)
    }, 700)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-3)' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.375rem', borderRadius: 8, color: 'var(--text-secondary)', display: 'flex' }}>
          <ChevronDown size={22} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <h2 style={{ fontSize: '1.0625rem' }}>Record Sale</h2>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {saved ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: 'var(--success)' }}>Sale Saved!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Saved on this device • will sync when online</p>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Amount - big and prominent */}
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Amount Received (UGX)</p>
              <input
                type="number" inputMode="numeric" pattern="[0-9]*"
                className="input"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                autoFocus
                style={{
                  textAlign: 'center', fontSize: '2.25rem', fontWeight: 800,
                  border: 'none', background: 'none', outline: 'none',
                  letterSpacing: '-0.03em', color: 'var(--success)',
                  width: '100%', padding: 0,
                }}
              />
              <div style={{ width: '80%', height: 2, background: 'var(--border)', margin: '0.75rem auto 0' }} />
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Description */}
              <div className="input-group">
                <label className="input-label" htmlFor="sale-desc">What was sold? <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input id="sale-desc" type="text" className="input"
                  placeholder="e.g. Bread, Airtime, Service…"
                  value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              {/* Discount */}
              <div className="input-group">
                <label className="input-label" htmlFor="sale-discount">Discount <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input id="sale-discount" type="number" inputMode="numeric" className="input"
                  placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
              </div>

              {/* Payment method */}
              <div className="input-group">
                <label className="input-label">Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm.value} type="button"
                      onClick={() => setPaymentMethod(pm.value)}
                      style={{
                        padding: '0.625rem', borderRadius: 10, border: '1.5px solid',
                        borderColor: paymentMethod === pm.value ? 'var(--primary)' : 'var(--border)',
                        background: paymentMethod === pm.value ? 'var(--primary-light)' : 'var(--surface)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.8125rem', fontWeight: paymentMethod === pm.value ? 600 : 400,
                        color: paymentMethod === pm.value ? 'var(--primary)' : 'var(--text-primary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>{pm.emoji}</span>{pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="input-group">
                <label className="input-label" htmlFor="sale-notes">Notes <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <textarea id="sale-notes" className="input"
                  placeholder="Any additional notes…"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} style={{ resize: 'none' }} />
              </div>
            </div>

            {/* Summary */}
            {amount && (
              <div className="card" style={{ background: 'var(--success-light)', border: '1px solid var(--success)' }}>
                <div className="flex-between">
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>Total Sale</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                    UGX {Math.max(0, parseFloat(amount || '0') - parseFloat(discount || '0')).toLocaleString()}
                  </span>
                </div>
                {parseFloat(discount || '0') > 0 && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                    After UGX {parseFloat(discount).toLocaleString()} discount
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0 0.25rem' }}>
              <Info size={13} />
              Saved on this device immediately. Syncs to cloud when online.
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading || !amount} style={{ marginTop: '0.25rem' }}>
              {loading ? <Loader2 size={20} /> : '💰 Save Sale'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
