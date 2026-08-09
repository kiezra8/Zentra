import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ChevronDown } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { generateId } from '@/utils/deviceId'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/business'
import { EXPENSE_CATEGORIES } from '@/types'
import type { Expense } from '@/types'

export default function AddExpensePage() {
  const navigate = useNavigate()
  const { activeBusiness } = useBusinessStore()

  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusiness || !amount) return
    setLoading(true)

    const now = Date.now()
    const expense: Expense = {
      id: generateId(),
      business_id: activeBusiness.id,
      category_id: category.id,
      category_name: category.name,
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      description: description.trim() || undefined,
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }

    await db.expenses.add(expense)
    setSaved(true)
    setTimeout(() => navigate(-1), 700)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-3)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.375rem', borderRadius: 8, color: 'var(--text-secondary)', display: 'flex' }}>
          <ChevronDown size={22} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <h2 style={{ fontSize: '1.0625rem' }}>Add Expense</h2>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {saved ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: 'var(--danger)' }}>Expense Saved!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Saved on this device • will sync when online</p>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Amount */}
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Amount Spent (UGX)</p>
              <input
                type="number" inputMode="numeric"
                className="input"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required autoFocus
                style={{ textAlign: 'center', fontSize: '2.25rem', fontWeight: 800, border: 'none', background: 'none', outline: 'none', letterSpacing: '-0.03em', color: 'var(--danger)', width: '100%', padding: 0 }}
              />
              <div style={{ width: '80%', height: 2, background: 'var(--border)', margin: '0.75rem auto 0' }} />
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Category */}
              <div className="input-group">
                <label className="input-label">Category</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button key={cat.id} type="button"
                      onClick={() => setCategory(cat)}
                      style={{
                        padding: '0.625rem 0.5rem', borderRadius: 10, border: '1.5px solid',
                        borderColor: category.id === cat.id ? 'var(--danger)' : 'var(--border)',
                        background: category.id === cat.id ? 'var(--danger-light)' : 'var(--surface)',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                        fontSize: '0.75rem', fontWeight: category.id === cat.id ? 600 : 400,
                        color: category.id === cat.id ? 'var(--danger)' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{cat.emoji}</span>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="input-group">
                <label className="input-label" htmlFor="exp-desc">Description <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input id="exp-desc" type="text" className="input"
                  placeholder="What was this expense for?"
                  value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              {/* Payment method */}
              <div className="input-group">
                <label className="input-label">Paid with</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {PAYMENT_METHODS.slice(0, 4).map(pm => (
                    <button key={pm.value} type="button"
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
                    ><span>{pm.emoji}</span>{pm.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {amount && (
              <div className="card" style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)' }}>
                <div className="flex-between">
                  <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Total Expense</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>
                    UGX {parseFloat(amount || '0').toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-danger btn-lg btn-full" disabled={loading || !amount} style={{ marginTop: '0.25rem' }}>
              {loading ? <Loader2 size={20} /> : '💸 Save Expense'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
