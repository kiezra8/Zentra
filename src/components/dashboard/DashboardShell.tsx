// Shared profit/loss hero card for all business dashboards
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCompact } from '@/utils/currency'
import { todayLabel } from '@/utils/date'


interface DashboardShellProps {
  income: number
  expenses: number
  extraStats?: { label: string; value: string | number; emoji: string }[]
  businessName: string
  businessEmoji: string
}

export function ProfitCard({ income, expenses, extraStats, businessName, businessEmoji }: DashboardShellProps) {
  const profit = income - expenses
  const isProfit = profit >= 0

  return (
    <div style={{
      background: isProfit
        ? 'linear-gradient(135deg, #0052CC 0%, #0066FF 100%)'
        : 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)',
      borderRadius: 20,
      padding: '1.5rem',
      marginBottom: '1rem',
      position: 'relative', overflow: 'hidden',
      boxShadow: isProfit ? '0 8px 24px rgba(0,102,255,0.3)' : '0 8px 24px rgba(220,38,38,0.3)',
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', bottom: -40, left: -10, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '1.25rem' }}>{businessEmoji}</span>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8125rem' }}>{todayLabel()} · {businessName}</p>
      </div>

      <div style={{ color: 'white', fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isProfit ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
        {formatCompact(Math.abs(profit))}
        <span style={{ fontSize: '1rem', fontWeight: 400, color: 'rgba(255,255,255,0.7)' }}>
          {isProfit ? 'Profit' : 'Loss'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>💰 Income</p>
          <p style={{ color: 'white', fontWeight: 700 }}>{formatCompact(income)}</p>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>💸 Expenses</p>
          <p style={{ color: 'white', fontWeight: 700 }}>{formatCompact(expenses)}</p>
        </div>
        {extraStats?.map((s, i) => (
          <div key={i}>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', display: 'inline-block', height: '100%' }} />
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>{s.emoji} {s.label}</p>
            <p style={{ color: 'white', fontWeight: 700 }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

interface QuickAction {
  to: string
  emoji: string
  label: string
  primary?: boolean
}

export function QuickActionsGrid({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(actions.length, 3)}, 1fr)`, gap: '0.625rem' }}>
        {actions.map(({ to, emoji, label, primary }) => (
          <Link key={to + label} to={to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: primary ? 'var(--primary)' : 'var(--surface-2)',
              border: `1px solid ${primary ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 12, padding: '0.875rem 0.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: primary ? 'white' : 'var(--text-primary)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

