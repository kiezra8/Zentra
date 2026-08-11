// Transport Dashboard — Boda Boda & Taxi
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative, startOfDay, endOfDay } from '@/utils/date'
import { ProfitCard, QuickActionsGrid } from '@/components/dashboard/DashboardShell'
import { BUSINESS_CATEGORIES } from '@/types/business'

export default function TransportDashboard() {
  const { activeBusiness } = useBusinessStore()
  const catConfig = BUSINESS_CATEGORIES.find(c => c.id === activeBusiness?.category)
  const s = startOfDay(), e = endOfDay()

  const todayTrips = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.transportTrips.where('business_id').equals(activeBusiness.id)
      .filter(x => x.created_at >= s && x.created_at <= e && !x.deleted_at).toArray()
  }, [activeBusiness?.id])

  const todayExpenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses.where('business_id').equals(activeBusiness.id)
      .filter(x => x.created_at >= s && x.created_at <= e && !x.deleted_at).toArray()
  }, [activeBusiness?.id])

  const recentTrips = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.transportTrips.where('business_id').equals(activeBusiness.id)
      .filter(x => !x.deleted_at).reverse().limit(8).toArray()
  }, [activeBusiness?.id])

  const tripIncome = todayTrips?.reduce((s, t) => s + t.income, 0) ?? 0
  const fuelCost = todayTrips?.reduce((s, t) => s + t.fuel_cost, 0) ?? 0
  const otherCost = todayTrips?.reduce((s, t) => s + t.other_cost, 0) ?? 0
  const otherExpenses = todayExpenses?.reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpenses = fuelCost + otherCost + otherExpenses

  if (!activeBusiness) return null

  return (
    <div className="page-container">
      <ProfitCard
        income={tripIncome} expenses={totalExpenses}
        businessName={activeBusiness.name}
        businessEmoji={catConfig?.emoji ?? '🛵'}
        extraStats={[
          { label: 'Trips', value: todayTrips?.length ?? 0, emoji: '🛵' },
          { label: 'Fuel', value: formatCurrency(fuelCost), emoji: '⛽' },
        ]}
      />

      <QuickActionsGrid actions={[
        { to: '/transport',    emoji: '🛵', label: 'New Trip',      primary: true },
        { to: '/transport',    emoji: '📋', label: 'All Trips' },
        { to: '/expenses/add', emoji: '⛽', label: 'Fuel Expense' },
        { to: '/expenses/add', emoji: '🔧', label: 'Repair Cost' },
        { to: '/cashbook',     emoji: '📖', label: 'Cashbook' },
        { to: '/reports',      emoji: '📊', label: 'Reports' },
      ]} />

      <div className="card" style={{ marginBottom: '5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.875rem' }}>Recent Trips</h3>
        {!recentTrips || recentTrips.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="empty-icon">{catConfig?.emoji ?? '🛵'}</span>
            <p className="empty-title">No trips recorded yet</p>
            <Link to="/transport" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              Record Trip
            </Link>
          </div>
        ) : recentTrips.map(trip => (
          <div key={trip.id} className="tx-item">
            <div className="tx-icon" style={{ background: '#FEF3C7' }}><span>{catConfig?.emoji ?? '🛵'}</span></div>
            <div className="tx-info">
              <div className="tx-name">
                {trip.pickup && trip.destination ? `${trip.pickup} → ${trip.destination}` : 'Trip'}
              </div>
              <div className="tx-meta">{formatRelative(trip.created_at)} · Fuel: {formatCurrency(trip.fuel_cost)}</div>
            </div>
            <div className="tx-amount income">{formatCurrency(trip.income)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
