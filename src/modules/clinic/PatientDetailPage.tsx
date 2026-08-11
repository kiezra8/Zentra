// Patient Detail Page — demographics, visit history, billing
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Plus, Phone, MapPin } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatDate, formatRelative } from '@/utils/date'
import { generateId } from '@/utils/deviceId'
import type { PatientBill } from '@/types'

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeBusiness } = useBusinessStore()
  const [showPayment, setShowPayment] = useState(false)
  const [selectedBill, setSelectedBill] = useState<PatientBill | null>(null)
  const [payAmount, setPayAmount] = useState('')

  const patient = useLiveQuery(() => id ? db.patients.get(id) : undefined, [id])

  const visits = useLiveQuery(async () => {
    if (!id) return []
    return db.patientVisits.where('patient_id').equals(id).reverse().toArray()
  }, [id])

  const bills = useLiveQuery(async () => {
    if (!id) return []
    return db.patientBills.where('patient_id').equals(id).reverse().toArray()
  }, [id])

  const totalOwed = bills?.filter(b => b.status !== 'paid').reduce((s, b) => s + b.balance, 0) ?? 0
  const totalPaid = bills?.reduce((s, b) => s + b.paid, 0) ?? 0

  async function handlePartialPayment() {
    if (!selectedBill || !payAmount) return
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) return
    const newPaid = selectedBill.paid + amount
    const newBalance = Math.max(0, selectedBill.total - newPaid)
    const newStatus: PatientBill['status'] = newBalance === 0 ? 'paid' : 'partial'
    await db.patientBills.update(selectedBill.id, {
      paid: newPaid, balance: newBalance, status: newStatus, updated_at: Date.now(), sync_status: 'pending',
    })
    setShowPayment(false)
    setPayAmount('')
    setSelectedBill(null)
  }

  if (!patient) return (
    <div className="page-container">
      <div className="empty-state"><span className="empty-icon">👤</span><p>Patient not found</p></div>
    </div>
  )

  const age = patient.dob ? Math.floor((Date.now() - patient.dob) / (365.25 * 24 * 3600 * 1000)) : null

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-icon btn-sm"><ChevronLeft size={20} /></button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem' }}>{patient.name}</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Patient Record</p>
        </div>
        <Link to={`/clinic/visit/new?patient=${patient.id}`} className="btn btn-primary btn-sm" style={{ gap: '0.375rem', textDecoration: 'none' }}>
          <Plus size={14} /> New Visit
        </Link>
      </div>

      {/* Demographics */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.875rem' }}>📋 Demographics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Gender</span><br /><strong>{patient.gender ?? 'Unknown'}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Age</span><br /><strong>{age !== null ? `${age} yrs` : 'Unknown'}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Blood Group</span><br /><strong>{patient.blood_group ?? '—'}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Date of Birth</span><br /><strong>{patient.dob ? formatDate(patient.dob) : '—'}</strong></div>
          {patient.phone && <div><span style={{ color: 'var(--text-muted)' }}>Phone</span><br /><a href={`tel:${patient.phone}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{patient.phone}</a></div>}
          {patient.address && <div><span style={{ color: 'var(--text-muted)' }}>Address</span><br /><strong>{patient.address}</strong></div>}
        </div>
        {patient.allergies && (
          <div style={{ marginTop: '0.875rem', padding: '0.625rem 0.875rem', background: 'var(--danger-light)', borderRadius: 10, color: 'var(--danger)', fontSize: '0.875rem' }}>
            ⚠️ <strong>Allergies / Notes:</strong> {patient.allergies}
          </div>
        )}
      </div>

      {/* Billing Summary */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.875rem' }}>💳 Billing Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.875rem' }}>
          {[
            { label: 'Total Bills', value: formatCurrency(bills?.reduce((s, b) => s + b.total, 0) ?? 0), color: 'var(--text-primary)' },
            { label: 'Total Paid', value: formatCurrency(totalPaid), color: 'var(--success)' },
            { label: 'Outstanding', value: formatCurrency(totalOwed), color: totalOwed > 0 ? 'var(--danger)' : 'var(--success)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '0.75rem', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
              <div style={{ fontWeight: 700, color: s.color, fontSize: '0.9375rem' }}>{s.value}</div>
            </div>
          ))}
        </div>
        {bills && bills.filter(b => b.status !== 'paid').map(bill => (
          <div key={bill.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Bill · {formatDate(bill.created_at)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total: {formatCurrency(bill.total)} · Paid: {formatCurrency(bill.paid)}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className={`badge badge-${bill.status === 'paid' ? 'success' : bill.status === 'partial' ? 'warning' : 'muted'}`}>{bill.status}</span>
              {bill.status !== 'paid' && (
                <button onClick={() => { setSelectedBill(bill); setShowPayment(true) }} className="btn btn-primary btn-sm">Pay</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Visit History */}
      <div className="card" style={{ marginBottom: '5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.875rem' }}>🩺 Visit History ({visits?.length ?? 0})</h3>
        {!visits || visits.length === 0 ? (
          <div className="empty-state" style={{ padding: '1rem' }}>
            <p className="empty-title">No visits yet</p>
            <Link to={`/clinic/visit/new?patient=${patient.id}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>Start First Visit</Link>
          </div>
        ) : visits.map(v => (
          <Link key={v.id} to={`/clinic/visit/${v.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', flexShrink: 0 }}>🩺</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{v.chief_complaint}</div>
                {v.diagnosis && <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>Dx: {v.diagnosis}</div>}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{formatRelative(v.visit_date)}</div>
              </div>
              <span className={`badge badge-${v.status === 'closed' ? 'success' : 'warning'}`} style={{ fontSize: '0.6875rem' }}>{v.status}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Payment modal */}
      {showPayment && selectedBill && (
        <div className="modal-backdrop" onClick={() => setShowPayment(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '1rem' }}>💳 Record Payment</h3>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Bill Total: {formatCurrency(selectedBill.total)} · Outstanding: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(selectedBill.balance)}</strong>
            </div>
            <div className="input-group" style={{ marginBottom: '1.25rem' }}>
              <label className="input-label">Amount Paying (UGX)</label>
              <input className="input" type="number" inputMode="numeric" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} autoFocus style={{ fontSize: '1.25rem', fontWeight: 700 }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowPayment(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handlePartialPayment} disabled={!payAmount} className="btn btn-primary" style={{ flex: 2 }}>Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
