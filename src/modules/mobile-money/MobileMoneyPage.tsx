import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Smartphone, Building2, Scale, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatTime, startOfDay, endOfDay } from '@/utils/date'
import { generateId } from '@/utils/deviceId'
import type { MobileMoneyTransaction, MobileMoneyNetwork, MobileMoneyTxType } from '@/types'

export default function MobileMoneyPage() {
  const { activeBusiness } = useBusinessStore()
  const [showModal, setShowModal] = useState(false)
  const [network, setNetwork] = useState<MobileMoneyNetwork>('mtn')
  const [txType, setTxType] = useState<MobileMoneyTxType>('deposit')
  const [amount, setAmount] = useState('')
  const [commission, setCommission] = useState('')
  const [txRef, setTxRef] = useState('')
  const [customerRef, setCustomerRef] = useState('')
  const [loading, setLoading] = useState(false)

  const todayStart = startOfDay()
  const todayEnd = endOfDay()

  const txs = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.mobileMoneyTransactions
      .where('business_id').equals(activeBusiness.id)
      .filter(t => !t.deleted_at && t.created_at >= todayStart && t.created_at <= todayEnd)
      .reverse()
      .toArray()
  }, [activeBusiness?.id, todayStart])

  // Calculate balances from all-time transactions
  const allTxs = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.mobileMoneyTransactions
      .where('business_id').equals(activeBusiness.id)
      .filter(t => !t.deleted_at)
      .toArray()
  }, [activeBusiness?.id])

  let mtnFloat = 500000 // initial default float baseline
  let airtelFloat = 500000
  let bankFloat = 1000000

  for (const t of allTxs ?? []) {
    const val = t.amount
    if (t.network === 'mtn') {
      if (t.type === 'deposit') mtnFloat -= val
      else if (t.type === 'withdrawal') mtnFloat += val
    } else if (t.network === 'airtel') {
      if (t.type === 'deposit') airtelFloat -= val
      else if (t.type === 'withdrawal') airtelFloat += val
    } else if (t.network === 'bank') {
      if (t.type === 'deposit') bankFloat -= val
      else if (t.type === 'withdrawal') bankFloat += val
    }
  }

  const totalCommission = (txs ?? []).reduce((s, x) => s + x.commission, 0)
  const totalFloat = mtnFloat + airtelFloat + bankFloat

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusiness || !amount) return
    setLoading(true)

    const now = Date.now()
    const record: MobileMoneyTransaction = {
      id: generateId(),
      business_id: activeBusiness.id,
      network,
      type: txType,
      amount: parseFloat(amount),
      commission: parseFloat(commission || '0'),
      tx_ref: txRef.trim() || undefined,
      customer_ref: customerRef.trim() || undefined,
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }

    await db.mobileMoneyTransactions.add(record)
    setAmount('')
    setCommission('')
    setTxRef('')
    setCustomerRef('')
    setShowModal(false)
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>Agent Book</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>MTN, Airtel & Bank Float</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
          <Plus size={16} /> New Transaction
        </button>
      </div>

      {/* Float Balances */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B45309' }}>🟡 MTN Float</p>
          <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#B45309', marginTop: 4 }}>{formatCurrency(mtnFloat)}</p>
        </div>
        <div className="card" style={{ background: '#FEE2E2', border: '1px solid #EF4444' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B91C1C' }}>🔴 Airtel Float</p>
          <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#B91C1C', marginTop: 4 }}>{formatCurrency(airtelFloat)}</p>
        </div>
        <div className="card" style={{ background: '#E0F2FE', border: '1px solid #0284C7' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369A1' }}>🔵 Bank Float</p>
          <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0369A1', marginTop: 4 }}>{formatCurrency(bankFloat)}</p>
        </div>
      </div>

      {/* Hero Summary */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'var(--surface-2)' }}>
        <div className="flex-between">
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total Agent Float</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatCurrency(totalFloat)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}>Today's Commission</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>+{formatCurrency(totalCommission)}</p>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Today's Agent Register</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!txs?.length ? (
          <div className="empty-state">
            <span className="empty-icon">📱</span>
            <p className="empty-title">No transactions logged today</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
              <Plus size={16} /> Record Transaction
            </button>
          </div>
        ) : (
          txs.map((t, i) => {
            const netColor = t.network === 'mtn' ? '#D97706' : t.network === 'airtel' ? '#DC2626' : '#0284C7'
            return (
              <div key={t.id} style={{ padding: '1rem 1.25rem', borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${netColor}15`, color: netColor, fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {t.network.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', textTransform: 'capitalize' }}>
                    {t.network} {t.type}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {formatTime(t.created_at)}
                    {t.tx_ref && ` • Ref: ${t.tx_ref}`}
                    {t.commission > 0 && ` • Comm: UGX ${t.commission}`}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: t.type === 'deposit' ? 'var(--danger)' : 'var(--success)' }}>
                  {t.type === 'deposit' ? '-' : '+'}{formatCurrency(t.amount)}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '1rem' }}>Record Agent Transaction</h3>

            <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Network */}
              <div className="input-group">
                <label className="input-label">Network / Bank</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'mtn', name: 'MTN', color: '#F59E0B' },
                    { id: 'airtel', name: 'Airtel', color: '#EF4444' },
                    { id: 'bank', name: 'Bank', color: '#0284C7' },
                  ].map(n => (
                    <button key={n.id} type="button" onClick={() => setNetwork(n.id as MobileMoneyNetwork)} style={{ padding: '0.625rem', borderRadius: 10, border: '1.5px solid', borderColor: network === n.id ? n.color : 'var(--border)', background: network === n.id ? `${n.color}15` : 'var(--surface)', fontWeight: 700, color: network === n.id ? n.color : 'var(--text-primary)', cursor: 'pointer' }}>
                      {n.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div className="tab-bar">
                <button type="button" className={`tab-item ${txType === 'deposit' ? 'active' : ''}`} onClick={() => setTxType('deposit')}>
                  💸 Cash Deposit (Float ➔ Cash)
                </button>
                <button type="button" className={`tab-item ${txType === 'withdrawal' ? 'active' : ''}`} onClick={() => setTxType('withdrawal')}>
                  💵 Cash Withdrawal (Cash ➔ Float)
                </button>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="mm-amt">Transaction Amount (UGX)</label>
                <input id="mm-amt" type="number" inputMode="numeric" className="input" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus style={{ fontSize: '1.25rem', fontWeight: 700 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="mm-comm">Expected Commission (opt)</label>
                  <input id="mm-comm" type="number" inputMode="numeric" className="input" placeholder="0" value={commission} onChange={e => setCommission(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="mm-ref">Tx ID / Ref (opt)</label>
                  <input id="mm-ref" type="text" className="input" placeholder="e.g. 19283741" value={txRef} onChange={e => setTxRef(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Saving…' : 'Save Transaction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
