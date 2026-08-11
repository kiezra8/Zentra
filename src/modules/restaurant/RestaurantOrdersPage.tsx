// Restaurant Orders Page — active orders management
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Plus, CheckCircle } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative } from '@/utils/date'
import type { OrderStatus } from '@/types'

const STATUS_COLORS: Record<OrderStatus, string> = {
  open: 'var(--primary)',
  preparing: '#D97706',
  served: 'var(--success)',
  paid: '#6B7280',
  cancelled: 'var(--danger)',
}

export default function RestaurantOrdersPage() {
  const { activeBusiness } = useBusinessStore()
  const [activeTab, setActiveTab] = useState<'active'|'paid'>('active')

  const activeOrders = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.orders.where('business_id').equals(activeBusiness.id)
      .filter(o => o.status !== 'paid' && o.status !== 'cancelled' && !o.deleted_at)
      .reverse().toArray()
  }, [activeBusiness?.id])

  const paidOrders = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.orders.where('business_id').equals(activeBusiness.id)
      .filter(o => (o.status === 'paid' || o.status === 'cancelled') && !o.deleted_at)
      .reverse().limit(20).toArray()
  }, [activeBusiness?.id])

  async function updateStatus(orderId: string, status: OrderStatus) {
    await db.orders.update(orderId, { status, updated_at: Date.now(), sync_status: 'pending' })
  }

  const orders = activeTab === 'active' ? activeOrders : paidOrders

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>🪑 Orders</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{activeOrders?.length ?? 0} active</p>
        </div>
        <Link to="/restaurant/orders/new" className="btn btn-primary btn-sm" style={{ gap: '0.375rem', textDecoration: 'none' }}>
          <Plus size={16} /> New Order
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'var(--surface-2)', borderRadius: 12, padding: '0.25rem' }}>
        {[{ id: 'active', label: `Active (${activeOrders?.length ?? 0})` }, { id: 'paid', label: 'History' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, borderRadius: 10 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {!orders || orders.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem 1rem' }}>
          <span className="empty-icon">🍽️</span>
          <p className="empty-title">{activeTab === 'active' ? 'No active orders' : 'No order history'}</p>
          {activeTab === 'active' && (
            <Link to="/restaurant/orders/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.75rem' }}>Take First Order</Link>
          )}
        </div>
      ) : orders.map(order => (
        <div key={order.id} className="card" style={{ marginBottom: '0.875rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.625rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                {order.table_no ? `Table ${order.table_no}` : order.customer_name ?? 'Takeaway'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {formatRelative(order.created_at)} · {order.items_count} items
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>{formatCurrency(order.total)}</div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: 6, background: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}>
                {order.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Action buttons for active orders */}
          {activeTab === 'active' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.625rem', borderTop: '1px solid var(--border)', paddingTop: '0.625rem' }}>
              {order.status === 'open' && <button onClick={() => updateStatus(order.id, 'preparing')} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>🍳 Preparing</button>}
              {order.status === 'preparing' && <button onClick={() => updateStatus(order.id, 'served')} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>✅ Served</button>}
              {(order.status === 'open' || order.status === 'preparing' || order.status === 'served') && (
                <button onClick={() => updateStatus(order.id, 'paid')} className="btn btn-primary btn-sm" style={{ flex: 1 }}>💰 Mark Paid</button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
