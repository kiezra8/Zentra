import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Plus, TrendingUp, TrendingDown, Wallet, AlertCircle, ArrowRight } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency, formatCompact } from '@/utils/currency'
import { formatRelative, todayLabel, startOfDay, endOfDay } from '@/utils/date'
import { BUSINESS_CATEGORIES } from '@/types/business'

function StatCard({ label, value, icon, color, trend }: {
  label: string; value: string; icon: string; color: string; trend?: 'up' | 'down' | null
}) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span className="stat-label">{label}</span>
        <div className="stat-icon" style={{ background: `${color}18` }}>
          <span style={{ fontSize: '1.125rem' }}>{icon}</span>
        </div>
      </div>
      <div className="stat-value">{value}</div>
      {trend && (
        <div className="stat-change" style={{ color: trend === 'up' ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 3 }}>
          {trend === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          Today
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { activeBusiness } = useBusinessStore()
  const catConfig = BUSINESS_CATEGORIES.find(c => c.id === activeBusiness?.category)

  const todayStart = startOfDay()
  const todayEnd = endOfDay()

  // Live queries from Dexie
  const todaySales = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.sales
      .where('business_id').equals(activeBusiness.id)
      .filter(s => s.created_at >= todayStart && s.created_at <= todayEnd && !s.deleted_at)
      .toArray()
  }, [activeBusiness?.id])

  const todayExpenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses
      .where('business_id').equals(activeBusiness.id)
      .filter(e => e.created_at >= todayStart && e.created_at <= todayEnd && !e.deleted_at)
      .toArray()
  }, [activeBusiness?.id])

  const recentSales = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.sales
      .where('business_id').equals(activeBusiness.id)
      .filter(s => !s.deleted_at)
      .reverse()
      .limit(5)
      .toArray()
  }, [activeBusiness?.id])

  const recentExpenses = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.expenses
      .where('business_id').equals(activeBusiness.id)
      .filter(e => !e.deleted_at)
      .reverse()
      .limit(3)
      .toArray()
  }, [activeBusiness?.id])

  const totalIncome = todaySales?.reduce((s, t) => s + t.total, 0) ?? 0
  const totalExpenses = todayExpenses?.reduce((s, t) => s + t.amount, 0) ?? 0
  const profit = totalIncome - totalExpenses

  // Module-specific recent data
  const todayTrips = useLiveQuery(async () => {
    if (!activeBusiness || !['boda_boda','taxi'].includes(activeBusiness.category)) return []
    return db.transportTrips
      .where('business_id').equals(activeBusiness.id)
      .filter(t => t.created_at >= todayStart && t.created_at <= todayEnd && !t.deleted_at)
      .toArray()
  }, [activeBusiness?.id])

  const todayIncome = useLiveQuery(async () => {
    if (!activeBusiness || activeBusiness.category !== 'hustler') return []
    return db.incomeEntries
      .where('business_id').equals(activeBusiness.id)
      .filter(t => t.created_at >= todayStart && t.created_at <= todayEnd && !t.deleted_at)
      .toArray()
  }, [activeBusiness?.id])

  if (!activeBusiness) return null

  const isTransport = ['boda_boda', 'taxi'].includes(activeBusiness.category)
  const isHustler = activeBusiness.category === 'hustler'
  const tripIncome = todayTrips?.reduce((s, t) => s + t.income, 0) ?? 0
  const tripExpenses = todayTrips?.reduce((s, t) => s + t.fuel_cost + t.other_cost, 0) ?? 0
  const hustlerIncome = todayIncome?.reduce((s, t) => s + t.amount, 0) ?? 0

  const displayIncome = isTransport ? tripIncome : isHustler ? hustlerIncome : totalIncome
  const displayExpenses = isTransport ? tripExpenses : totalExpenses
  const displayProfit = displayIncome - displayExpenses

  return (
    <div className="page-container">
      {/* Greeting */}
      <div style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{todayLabel()}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.375rem' }}>
            {catConfig?.emoji} {activeBusiness.name}
          </h2>
        </div>
      </div>

      {/* Hero profit card */}
      <div style={{
        background: profit >= 0
          ? 'linear-gradient(135deg, #0052CC 0%, #0066FF 100%)'
          : 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)',
        borderRadius: 20,
        padding: '1.5rem',
        marginBottom: '1rem',
        position: 'relative', overflow: 'hidden',
        boxShadow: profit >= 0 ? '0 8px 24px rgba(0,102,255,0.3)' : '0 8px 24px rgba(220,38,38,0.3)',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
          Today's {displayProfit >= 0 ? 'Profit' : 'Loss'}
        </p>
        <div style={{ color: 'white', fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1.125rem' }}>
          {formatCompact(Math.abs(displayProfit))}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Income</p>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{formatCompact(displayIncome)}</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Expenses</p>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{formatCompact(displayExpenses)}</p>
          </div>
          {isTransport && (
            <>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Trips</p>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{todayTrips?.length ?? 0}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <StatCard label="Income"   value={formatCompact(displayIncome)}   icon="💰" color="var(--success)" trend="up" />
        <StatCard label="Expenses" value={formatCompact(displayExpenses)}  icon="💸" color="var(--danger)"  trend="down" />
        <StatCard label={isTransport ? 'Trips Today' : 'Sales Today'} value={isTransport ? String(todayTrips?.length ?? 0) : String(todaySales?.length ?? 0)} icon={isTransport ? '🛵' : '🧾'} color="var(--primary)" />
        <StatCard label="Net Profit" value={formatCompact(displayProfit)} icon={displayProfit >= 0 ? '📈' : '📉'} color={displayProfit >= 0 ? 'var(--success)' : 'var(--danger)'} />
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
          {[
            { to: '/sales/add',   emoji: '💰', label: isHustler ? 'Add Income' : 'Record Sale', primary: true },
            { to: '/products',    emoji: '📦', label: 'Stock & Items', primary: false },
            { to: '/cashbook',    emoji: '📖', label: 'Cashbook', primary: false },
            { to: '/customers',   emoji: '👥', label: 'Customers', primary: false },
            { to: '/expenses/add',emoji: '💸', label: 'Add Expense', primary: false },
            isTransport
              ? { to: '/transport', emoji: '🛵', label: 'New Trip', primary: false }
              : isHustler
              ? { to: '/hustler',   emoji: '🧑‍💼', label: 'My Income', primary: false }
              : { to: '/reports',   emoji: '📊', label: 'Reports', primary: false },
          ].map(({ to, emoji, label, primary }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div style={{
                background: primary ? 'var(--primary)' : 'var(--surface-2)',
                border: `1px solid ${primary ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 12, padding: '0.875rem 0.5rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: primary ? 'white' : 'var(--text-primary)', textAlign: 'center' }}>{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.875rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Recent Sales</h3>
          <Link to="/sales" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {!recentSales || recentSales.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="empty-icon">🧾</span>
            <p className="empty-title">No sales yet today</p>
            <Link to="/sales/add" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              <Plus size={16} /> Record First Sale
            </Link>
          </div>
        ) : (
          recentSales.map(sale => (
            <div key={sale.id} className="tx-item">
              <div className="tx-icon" style={{ background: 'var(--success-light)' }}>
                <span>💰</span>
              </div>
              <div className="tx-info">
                <div className="tx-name">{sale.receipt_no ? `Sale #${sale.receipt_no}` : 'Sale'}</div>
                <div className="tx-meta">{formatRelative(sale.created_at)} • {sale.payment_method.replace('_', ' ')}</div>
              </div>
              <div className="tx-amount income">{formatCurrency(sale.total)}</div>
            </div>
          ))
        )}
      </div>

      {/* Recent expenses */}
      {recentExpenses && recentExpenses.length > 0 && (
        <div className="card" style={{ marginBottom: '5rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.875rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Recent Expenses</h3>
            <Link to="/expenses" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recentExpenses.map(exp => (
            <div key={exp.id} className="tx-item">
              <div className="tx-icon" style={{ background: 'var(--danger-light)' }}>
                <span>💸</span>
              </div>
              <div className="tx-info">
                <div className="tx-name">{exp.category_name}</div>
                <div className="tx-meta">{formatRelative(exp.created_at)} {exp.description ? `• ${exp.description}` : ''}</div>
              </div>
              <div className="tx-amount expense">-{formatCurrency(exp.amount)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
