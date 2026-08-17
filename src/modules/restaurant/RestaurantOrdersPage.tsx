// Restaurant Orders Page — active orders management & sales recording
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Plus, UtensilsCrossed, CheckCircle2, ChevronRight, CreditCard } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatRelative } from '@/utils/date'
import { generateId } from '@/utils/deviceId'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/business'
import type { Order, OrderStatus, Sale, SaleItem } from '@/types'

const STATUS_COLORS: Record<OrderStatus, string> = {
  open: 'var(--primary)',
  preparing: '#D97706',
  served: 'var(--success)',
  paid: '#6B7280',
  cancelled: 'var(--danger)',
}

export default function RestaurantOrdersPage() {
  const { activeBusiness } = useBusinessStore()
  const [activeTab, setActiveTab] = useState<'active' | 'paid'>('active')
  const [payingOrder, setPayingOrder] = useState<Order | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [loading, setLoading] = useState(false)

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
      .reverse().limit(30).toArray()
  }, [activeBusiness?.id])

  async function updateStatus(orderId: string, status: OrderStatus) {
    await db.orders.update(orderId, { status, updated_at: Date.now(), sync_status: 'pending' })
  }

  async function handleCompletePayment() {
    if (!payingOrder || !activeBusiness) return
    setLoading(true)
    const now = Date.now()

    // 1. Update Order in Dexie
    await db.orders.update(payingOrder.id, {
      status: 'paid',
      payment_method: paymentMethod,
      updated_at: now,
      sync_status: 'pending',
    })

    // 2. Query items for this order
    const orderItems = await db.orderItems.where('order_id').equals(payingOrder.id).toArray()

    // 3. Create Sale record in db.sales
    const saleId = generateId()
    const orderLabel = payingOrder.table_no
      ? `Table ${payingOrder.table_no}`
      : payingOrder.customer_name
      ? payingOrder.customer_name
      : 'Takeaway'

    const sale: Sale = {
      id: saleId,
      business_id: activeBusiness.id,
      total: payingOrder.total,
      subtotal: payingOrder.subtotal,
      discount: payingOrder.discount || 0,
      tax: 0,
      payment_method: paymentMethod,
      receipt_no: `ORD-${payingOrder.id.slice(-6).toUpperCase()}`,
      notes: `Restaurant Order — ${orderLabel}`,
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }
    await db.sales.add(sale)

    // 4. Create SaleItem records in db.saleItems
    for (const item of orderItems) {
      const saleItem: SaleItem = {
        id: generateId(),
        sale_id: saleId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        discount: 0,
        total: item.total,
      }
      await db.saleItems.add(saleItem)
    }

    setLoading(false)
    setPayingOrder(null)
  }

  const orders = activeTab === 'active' ? activeOrders : paidOrders

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2>🪑 Restaurant Orders</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {activeOrders?.length ?? 0} active orders · Completed orders sync to Sales
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/restaurant/menu" className="btn btn-secondary btn-sm" style={{ gap: '0.375rem', textDecoration: 'none' }}>
            <UtensilsCrossed size={15} /> Menu Setup
          </Link>
          <Link to="/restaurant/orders/new" className="btn btn-primary btn-sm" style={{ gap: '0.375rem', textDecoration: 'none' }}>
            <Plus size={16} /> New Order
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'var(--surface-2)', borderRadius: 12, padding: '0.25rem' }}>
        {[{ id: 'active', label: `Active Tables & Orders (${activeOrders?.length ?? 0})` }, { id: 'paid', label: `Sales History (${paidOrders?.length ?? 0})` }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 10 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!orders || orders.length === 0 ? (
        <div className="empty-state" style={{ padding: '3.5rem 1rem' }}>
          <span className="empty-icon">🍽️</span>
          <p className="empty-title">{activeTab === 'active' ? 'No active orders' : 'No order history yet'}</p>
          <p className="empty-desc">{activeTab === 'active' ? 'Take an order from a table or takeaway customer' : 'Completed paid orders will appear here and in your sales register'}</p>
          {activeTab === 'active' && (
            <Link to="/restaurant/orders/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: '0.75rem' }}>
              Take First Order
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '5rem' }}>
          {orders.map(order => (
            <div key={order.id} className="card" style={{ padding: '1.125rem' }}>
              <div className="flex-between" style={{ marginBottom: '0.625rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.0625rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {order.table_no ? `Table ${order.table_no}` : order.customer_name ?? 'Takeaway'}
                    {order.customer_name && order.table_no && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>({order.customer_name})</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatRelative(order.created_at)} · {order.items_count} items
                    {order.payment_method && ` · Paid via ${order.payment_method.replace('_', ' ')}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--primary)' }}>
                    {formatCurrency(order.total)}
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 6,
                    background: (STATUS_COLORS[order.status] || '#6B7280') + '20',
                    color: STATUS_COLORS[order.status] || '#6B7280',
                    display: 'inline-block',
                    marginTop: 3,
                  }}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Action buttons for active orders */}
              {activeTab === 'active' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  {order.status === 'open' && (
                    <button onClick={() => updateStatus(order.id, 'preparing')} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                      🍳 Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button onClick={() => updateStatus(order.id, 'served')} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                      ✅ Mark Served
                    </button>
                  )}
                  {(order.status === 'open' || order.status === 'preparing' || order.status === 'served') && (
                    <button
                      onClick={() => {
                        setPayingOrder(order)
                        setPaymentMethod('cash')
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1.2, gap: '0.25rem' }}
                    >
                      <CreditCard size={15} /> 💰 Mark Paid & Add to Sales
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Selection Modal */}
      {payingOrder && (
        <div className="modal-backdrop" onClick={() => setPayingOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '0.5rem' }}>💰 Receive Payment & Record Sale</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Order for <strong>{payingOrder.table_no ? `Table ${payingOrder.table_no}` : payingOrder.customer_name || 'Takeaway'}</strong> — Total: <strong style={{ color: 'var(--primary)', fontSize: '1.125rem' }}>{formatCurrency(payingOrder.total)}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <label className="input-label">Select Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {PAYMENT_METHODS.map(pm => (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => setPaymentMethod(pm.value)}
                    className="card"
                    style={{
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      border: paymentMethod === pm.value ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: paymentMethod === pm.value ? 'var(--primary-light)' : 'var(--surface)',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{pm.emoji}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: paymentMethod === pm.value ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {pm.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setPayingOrder(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={handleCompletePayment}
                disabled={loading}
              >
                {loading ? 'Recording…' : '✅ Confirm & Save to Sales'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
