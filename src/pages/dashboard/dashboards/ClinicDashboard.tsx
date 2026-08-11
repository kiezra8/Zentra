// Clinic Dashboard
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency, formatCompact } from '@/utils/currency'
import { formatRelative, startOfDay, endOfDay } from '@/utils/date'
import { ProfitCard, QuickActionsGrid } from '@/components/dashboard/DashboardShell'

export default function ClinicDashboard() {
  const { activeBusiness } = useBusinessStore()
  const s = startOfDay(), e = endOfDay()

  const todaySales = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.sales.where('business_id').equals(activeBusiness.id)
      .filter(x => x.created_at >= s && x.created_at <= e && !x.deleted_at).toArray()
  }, [activeBusiness?.id])

  const todayExpenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses.where('business_id').equals(activeBusiness.id)
      .filter(x => x.created_at >= s && x.created_at <= e && !x.deleted_at).toArray()
  }, [activeBusiness?.id])

  const todayVisits = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.patientVisits.where('business_id').equals(activeBusiness.id)
      .filter(v => v.visit_date >= s && v.visit_date <= e).toArray()
  }, [activeBusiness?.id])

  const openVisits = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.patientVisits.where('business_id').equals(activeBusiness.id)
      .filter(v => v.status !== 'closed').reverse().limit(5).toArray()
  }, [activeBusiness?.id])

  const totalPatients = useLiveQuery(async () => {
    if (!activeBusiness) return 0
    return db.patients.where('business_id').equals(activeBusiness.id).count()
  }, [activeBusiness?.id])

  const pendingBills = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.patientBills.where('business_id').equals(activeBusiness.id)
      .filter(b => b.status !== 'paid').toArray()
  }, [activeBusiness?.id])

  const income = todaySales?.reduce((s, t) => s + t.total, 0) ?? 0
  const expenses = todayExpenses?.reduce((s, t) => s + t.amount, 0) ?? 0
  const pendingBalance = pendingBills?.reduce((s, b) => s + b.balance, 0) ?? 0

  if (!activeBusiness) return null

  return (
    <div className="page-container">
      <ProfitCard
        income={income} expenses={expenses}
        businessName={activeBusiness.name}
        businessEmoji="🏥"
        extraStats={[
          { label: "Today's Visits", value: todayVisits?.length ?? 0, emoji: '👤' },
          { label: 'Patients', value: totalPatients ?? 0, emoji: '📋' },
        ]}
      />

      <QuickActionsGrid actions={[
        { to: '/clinic/patients/new',  emoji: '➕', label: 'Register Patient', primary: true },
        { to: '/clinic/patients',      emoji: '👤', label: 'Patients' },
        { to: '/clinic/visit/new',     emoji: '🩺', label: 'New Visit' },
        { to: '/clinic/dispensary',    emoji: '💊', label: 'Dispensary' },
        { to: '/expenses/add',         emoji: '💸', label: 'Add Expense' },
        { to: '/reports',              emoji: '📊', label: 'Reports' },
      ]} />

      {/* Pending bills alert */}
      {pendingBills && pendingBills.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'var(--warning)', background: 'var(--warning-light)' }}>
          <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '0.375rem' }}>
            💳 {pendingBills.length} unpaid bill{pendingBills.length > 1 ? 's' : ''} · {formatCurrency(pendingBalance)} owed
          </div>
          <Link to="/clinic/patients" style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            View patient billing →
          </Link>
        </div>
      )}

      {/* Active visits */}
      <div className="card" style={{ marginBottom: '5rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.875rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Active Visits Today</h3>
          <Link to="/clinic/patients" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            All patients <ArrowRight size={14} />
          </Link>
        </div>
        {!openVisits || openVisits.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="empty-icon">🩺</span>
            <p className="empty-title">No active visits</p>
            <Link to="/clinic/visit/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              Start a Visit
            </Link>
          </div>
        ) : openVisits.map(visit => (
          <div key={visit.id} className="tx-item">
            <div className="tx-icon" style={{ background: '#EFF6FF' }}><span>🩺</span></div>
            <div className="tx-info">
              <div className="tx-name">{visit.chief_complaint}</div>
              <div className="tx-meta">{formatRelative(visit.created_at)} · {visit.status.replace(/_/g, ' ')}</div>
            </div>
            <span className={`badge badge-${visit.status === 'closed' ? 'success' : 'warning'}`} style={{ fontSize: '0.6875rem' }}>
              {visit.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
