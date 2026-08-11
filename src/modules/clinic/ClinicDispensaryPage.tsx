// Clinic Dispensary Page — medicine stock + dispense prescriptions
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Package, CheckCircle, AlertCircle } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative } from '@/utils/date'

export default function ClinicDispensaryPage() {
  const { activeBusiness } = useBusinessStore()
  const [activeTab, setActiveTab] = useState<'medicines'|'pending'>('pending')

  // Medicines (products flagged as medicine category)
  const medicines = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.products.where('business_id').equals(activeBusiness.id)
      .filter(p => p.is_active && !p.deleted_at).toArray()
  }, [activeBusiness?.id])

  // Pending prescriptions not yet dispensed
  const pendingRx = useLiveQuery(async () => {
    if (!activeBusiness) return []
    const rxs = await db.prescriptions.where('business_id').equals(activeBusiness.id)
      .filter(r => !r.dispensed && !r.deleted_at).toArray()
    // Enrich with patient name from visit → patient
    const enriched = await Promise.all(rxs.map(async rx => {
      const visit = await db.patientVisits.get(rx.visit_id)
      const patient = visit ? await db.patients.get(visit.patient_id) : null
      return { ...rx, patientName: patient?.name ?? 'Unknown', visitDate: visit?.visit_date ?? rx.created_at }
    }))
    return enriched.sort((a, b) => b.visitDate - a.visitDate)
  }, [activeBusiness?.id])

  async function handleDispense(rxId: string) {
    await db.prescriptions.update(rxId, {
      dispensed: true, dispensed_at: Date.now(), updated_at: Date.now(), sync_status: 'pending',
    })
  }

  const lowStock = medicines?.filter(m => m.stock_qty <= m.min_stock) ?? []

  if (!activeBusiness) return null

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <h2>💊 Dispensary</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Medicine stock & prescription dispensing</p>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'var(--warning)', background: 'var(--warning-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400E', fontWeight: 700, marginBottom: '0.5rem' }}>
            <AlertCircle size={16} /> {lowStock.length} medicine{lowStock.length > 1 ? 's' : ''} running low
          </div>
          {lowStock.slice(0, 3).map(m => (
            <div key={m.id} style={{ fontSize: '0.8125rem', color: '#92400E' }}>
              • {m.name} — {m.stock_qty} {m.unit ?? 'units'} left
            </div>
          ))}
          <Link to="/products" style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, display: 'block', marginTop: '0.5rem', textDecoration: 'none' }}>
            Restock medicines →
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'var(--surface-2)', borderRadius: 12, padding: '0.25rem' }}>
        {[
          { id: 'pending', label: `Pending Rx${pendingRx && pendingRx.length > 0 ? ` (${pendingRx.length})` : ''}` },
          { id: 'medicines', label: 'Medicine Stock' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 10 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending prescriptions */}
      {activeTab === 'pending' && (
        <div>
          {!pendingRx || pendingRx.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <CheckCircle size={48} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
              <p className="empty-title">All prescriptions dispensed!</p>
            </div>
          ) : pendingRx.map(rx => (
            <div key={rx.id} className="card" style={{ marginBottom: '0.875rem' }}>
              <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>💊 {rx.medicine_name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Patient: <strong>{rx.patientName}</strong> · {formatRelative(rx.visitDate)}
                  </div>
                </div>
                <button onClick={() => handleDispense(rx.id)} className="btn btn-primary btn-sm">
                  Dispense ✓
                </button>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>Dose: {rx.dosage}</span>
                <span>Freq: {rx.frequency}</span>
                <span>Duration: {rx.duration}</span>
                <span>Qty: {rx.quantity}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Medicine stock */}
      {activeTab === 'medicines' && (
        <div style={{ marginBottom: '5rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.875rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{medicines?.length ?? 0} items in stock</span>
            <Link to="/products" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>+ Add Medicine</Link>
          </div>
          {!medicines || medicines.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <span className="empty-icon"><Package size={40} /></span>
              <p className="empty-title">No medicines in stock</p>
              <Link to="/products" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.75rem' }}>Add Medicines</Link>
            </div>
          ) : medicines.map(m => (
            <div key={m.id} className="tx-item">
              <div className="tx-icon" style={{ background: m.stock_qty <= m.min_stock ? 'var(--danger-light)' : '#F0FDF4' }}>
                <span>{m.stock_qty <= m.min_stock ? '⚠️' : '💊'}</span>
              </div>
              <div className="tx-info">
                <div className="tx-name">{m.name}</div>
                <div className="tx-meta">
                  Stock: {m.stock_qty} {m.unit ?? 'units'} · Cost: {formatCurrency(m.buying_price)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: m.stock_qty <= m.min_stock ? 'var(--danger)' : 'var(--success)' }}>
                  {m.stock_qty} left
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
