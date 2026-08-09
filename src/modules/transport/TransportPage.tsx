import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Bike, Fuel, Wrench, Navigation } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatTime, startOfDay, endOfDay } from '@/utils/date'
import { generateId } from '@/utils/deviceId'
import type { TransportTrip } from '@/types'

export default function TransportPage() {
  const { activeBusiness } = useBusinessStore()
  const [showModal, setShowModal] = useState(false)
  const [income, setIncome] = useState('')
  const [fuelCost, setFuelCost] = useState('')
  const [otherCost, setOtherCost] = useState('')
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)

  const todayStart = startOfDay()
  const todayEnd = endOfDay()

  const trips = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.transportTrips
      .where('business_id').equals(activeBusiness.id)
      .filter(t => !t.deleted_at && t.created_at >= todayStart && t.created_at <= todayEnd)
      .reverse()
      .toArray()
  }, [activeBusiness?.id, todayStart])

  const totalIncome = (trips ?? []).reduce((sum, t) => sum + t.income, 0)
  const totalFuel = (trips ?? []).reduce((sum, t) => sum + t.fuel_cost, 0)
  const totalOther = (trips ?? []).reduce((sum, t) => sum + t.other_cost, 0)
  const totalExpenses = totalFuel + totalOther
  const netEarnings = totalIncome - totalExpenses

  async function handleAddTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusiness || !income) return
    setLoading(true)

    const now = Date.now()
    const trip: TransportTrip = {
      id: generateId(),
      business_id: activeBusiness.id,
      income: parseFloat(income),
      fuel_cost: parseFloat(fuelCost || '0'),
      other_cost: parseFloat(otherCost || '0'),
      pickup: pickup.trim() || undefined,
      destination: destination.trim() || undefined,
      payment_method: 'cash',
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }

    await db.transportTrips.add(trip)
    setIncome('')
    setFuelCost('')
    setOtherCost('')
    setPickup('')
    setDestination('')
    setShowModal(false)
    setLoading(false)
  }

  return (
    <div className="page-container">
      {/* Title */}
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>Boda / Transport Tracker</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Quick trip & fuel logger</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
          <Plus size={16} /> New Trip
        </button>
      </div>

      {/* Hero Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem', background: 'linear-gradient(135deg, #1E293B, #0F172A)', color: 'white', border: 'none', borderRadius: 20 }}>
        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>Today's Net Take-Home</p>
        <div style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1.25rem', color: netEarnings >= 0 ? '#4ADE80' : '#F87171' }}>
          {formatCurrency(netEarnings)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Trips Today</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>{trips?.length ?? 0}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Total Income</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#4ADE80' }}>{formatCurrency(totalIncome)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Fuel & Costs</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F87171' }}>{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Trips list */}
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Today's Trips</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!trips?.length ? (
          <div className="empty-state">
            <span className="empty-icon">🛵</span>
            <p className="empty-title">No trips recorded today</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
              <Plus size={16} /> Log First Trip
            </button>
          </div>
        ) : (
          trips.map((t, i) => (
            <div key={t.id} style={{ padding: '1rem 1.25rem', borderBottom: i < trips.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bike size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {t.pickup || t.destination ? `${t.pickup ?? 'Start'} ➔ ${t.destination ?? 'End'}` : 'Trip'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {formatTime(t.created_at)}
                  {t.fuel_cost > 0 && ` • Fuel: UGX ${t.fuel_cost.toLocaleString()}`}
                </div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                +{formatCurrency(t.income)}
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
            <h3 style={{ marginBottom: '1rem' }}>Log New Trip</h3>
            <form onSubmit={handleAddTrip} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="trip-fare">Trip Fare / Income (UGX)</label>
                <input id="trip-fare" type="number" inputMode="numeric" className="input" placeholder="e.g. 5000" value={income} onChange={e => setIncome(e.target.value)} required autoFocus style={{ fontSize: '1.25rem', fontWeight: 700 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="trip-fuel">
                    <Fuel size={13} style={{ display: 'inline', marginRight: 4 }} />
                    Fuel cost (opt)
                  </label>
                  <input id="trip-fuel" type="number" inputMode="numeric" className="input" placeholder="0" value={fuelCost} onChange={e => setFuelCost(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="trip-other">
                    <Wrench size={13} style={{ display: 'inline', marginRight: 4 }} />
                    Repair/Other (opt)
                  </label>
                  <input id="trip-other" type="number" inputMode="numeric" className="input" placeholder="0" value={otherCost} onChange={e => setOtherCost(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="trip-pickup">Stage / Pickup</label>
                  <input id="trip-pickup" type="text" className="input" placeholder="e.g. Wandegeya" value={pickup} onChange={e => setPickup(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="trip-dest">Destination</label>
                  <input id="trip-dest" type="text" className="input" placeholder="e.g. Kololo" value={destination} onChange={e => setDestination(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Saving…' : 'Save Trip'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
