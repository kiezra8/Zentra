// Restaurant Dashboard
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative, startOfDay, endOfDay } from '@/utils/date'
import { ProfitCard, QuickActionsGrid } from '@/components/dashboard/DashboardShell'

export default function RestaurantDashboard() {
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

  const activeOrders = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.orders.where('business_id').equals(activeBusiness.id)
      .filter(o => o.status === 'open' || o.status === 'preparing').reverse().limit(10).toArray()
  }, [activeBusiness?.id])

  const income = todaySales?.reduce((s, t) => s + t.total, 0) ?? 0
  const expenses = todayExpenses?.reduce((s, t) => s + t.amount, 0) ?? 0

  if (!activeBusiness) return null

  return (
    <div className="page-container">
      <ProfitCard
        income={income} expenses={expenses}
        businessName={activeBusiness.name}
        businessEmoji="🍽️"
        extraStats={[
          { label: "Today's Orders", value: todaySales?.length ?? 0, emoji: '🧾' },
          { label: 'Active Tables', value: activeOrders?.length ?? 0, emoji: '🪑' },
        ]}
      />

      <QuickActionsGrid actions={[
        { to: '/restaurant/orders/new', emoji: '➕', label: 'New Order',    primary: true },
        { to: '/restaurant/orders',     emoji: '🪑', label: 'Active Orders' },
        { to: '/restaurant/menu',       emoji: '📋', label: 'Menu' },
        { to: '/products',              emoji: '📦', label: 'Ingredients' },
        { to: '/expenses/add',          emoji: '💸', label: 'Add Expense' },
        { to: '/reports',               emoji: '📊', label: 'Reports' },
      ]} />

      {/* Active orders */}
      <div className="card" style={{ marginBottom: '5rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.875rem' }}>
          <h3 style={{ fontSize: '1rem' }}>🪑 Active Orders</h3>
          <Link to="/restaurant/orders" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            All orders <ArrowRight size={14} />
          </Link>
        </div>
        {!activeOrders || activeOrders.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="empty-icon">🍽️</span>
            <p className="empty-title">No active orders</p>
            <Link to="/restaurant/orders/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              Take New Order
            </Link>
          </div>
        ) : activeOrders.map(order => (
          <div key={order.id} className="tx-item">
            <div className="tx-icon" style={{ background: '#FEF3C7' }}><span>🍽️</span></div>
            <div className="tx-info">
              <div className="tx-name">{order.table_no ? `Table ${order.table_no}` : order.customer_name ?? 'Takeaway'}</div>
              <div className="tx-meta">{formatRelative(order.created_at)} · {order.items_count} items</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tx-amount income">{formatCurrency(order.total)}</div>
              <span className={`badge badge-${order.status === 'preparing' ? 'warning' : 'muted'}`} style={{ fontSize: '0.6875rem' }}>
                {order.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
