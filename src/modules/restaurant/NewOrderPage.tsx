// New Restaurant Order Page — select items from menu, set table, send to kitchen or pay now
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Minus, Trash2, CreditCard, Utensils } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { generateId } from '@/utils/deviceId'
import { formatCurrency } from '@/utils/currency'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/business'
import type { Order, OrderItem, Sale, SaleItem } from '@/types'

interface CartItem { menuItemId: string; name: string; price: number; qty: number }

export default function NewOrderPage() {
  const navigate = useNavigate()
  const { activeBusiness } = useBusinessStore()
  const [cart, setCart] = useState<CartItem[]>([])
  const [tableNo, setTableNo] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [menuCategory, setMenuCategory] = useState<string>('all')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [showPayModal, setShowPayModal] = useState(false)

  const menuItems = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.menuItems.where('business_id').equals(activeBusiness.id)
      .filter(m => m.is_available && !m.deleted_at).toArray()
  }, [activeBusiness?.id])

  const categories = ['all', ...Array.from(new Set(menuItems?.map(m => m.category) ?? []))]
  const filtered = menuCategory === 'all' ? menuItems : menuItems?.filter(m => m.category === menuCategory)

  function addToCart(itemId: string, name: string, price: number) {
    setCart(c => {
      const existing = c.find(x => x.menuItemId === itemId)
      if (existing) return c.map(x => x.menuItemId === itemId ? {...x, qty: x.qty + 1} : x)
      return [...c, { menuItemId: itemId, name, price, qty: 1 }]
    })
  }
  function changeQty(itemId: string, delta: number) {
    setCart(c => c.map(x => x.menuItemId === itemId ? {...x, qty: Math.max(0, x.qty + delta)} : x).filter(x => x.qty > 0))
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const discountAmt = parseFloat(discount) || 0
  const total = Math.max(0, subtotal - discountAmt)

  async function handleCreateOrder(isPaid: boolean) {
    if (cart.length === 0 || !activeBusiness) return
    setSaving(true)
    const now = Date.now()
    const orderId = generateId()

    const order: Order = {
      id: orderId,
      business_id: activeBusiness.id,
      table_no: tableNo.trim() || undefined,
      customer_name: customerName.trim() || undefined,
      items_count: cart.reduce((s, i) => s + i.qty, 0),
      subtotal,
      discount: discountAmt,
      total,
      payment_method: isPaid ? paymentMethod : undefined,
      status: isPaid ? 'paid' : 'open',
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }
    await db.orders.add(order)

    // Save order items
    for (const item of cart) {
      const oi: OrderItem = {
        id: generateId(),
        order_id: order.id,
        menu_item_id: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.qty,
        total: item.price * item.qty,
      }
      await db.orderItems.add(oi)
    }

    // IF PAID, AUTOMATICALLY RECORD AS PART OF SALES
    if (isPaid) {
      const saleId = generateId()
      const orderLabel = order.table_no ? `Table ${order.table_no}` : order.customer_name ? order.customer_name : 'Takeaway'

      const sale: Sale = {
        id: saleId,
        business_id: activeBusiness.id,
        total,
        subtotal,
        discount: discountAmt,
        tax: 0,
        payment_method: paymentMethod,
        receipt_no: `ORD-${orderId.slice(-6).toUpperCase()}`,
        notes: `Restaurant Order — ${orderLabel}`,
        created_at: now,
        updated_at: now,
        ...buildSyncMeta(),
      }
      await db.sales.add(sale)

      for (const item of cart) {
        const saleItem: SaleItem = {
          id: generateId(),
          sale_id: saleId,
          name: item.name,
          quantity: item.qty,
          unit_price: item.price,
          discount: 0,
          total: item.price * item.qty,
        }
        await db.saleItems.add(saleItem)
      }
    }

    setSaving(false)
    navigate('/restaurant/orders')
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-3)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)', padding: '1.5rem 1.25rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '0.5rem', color: 'white', cursor: 'pointer', display: 'flex' }}>
              <ChevronLeft size={20} />
            </button>
            <h1 style={{ color: 'white', fontSize: '1.25rem' }}>🍽️ New Order</h1>
          </div>
          <button
            onClick={() => navigate('/restaurant/menu')}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
              padding: '0.4rem 0.75rem', color: 'white', cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: 600,
            }}
          >
            Menu Setup
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input className="input" placeholder="Table No (optional)" value={tableNo} onChange={e => setTableNo(e.target.value)} style={{ flex: 1, background: 'rgba(255,255,255,0.9)' }} />
          <input className="input" placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ flex: 2, background: 'rgba(255,255,255,0.9)' }} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.25rem', overflowX: 'auto', scrollbarWidth: 'none', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setMenuCategory(cat)}
              className={`btn btn-sm ${menuCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ whiteSpace: 'nowrap', borderRadius: 20 }}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Menu items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem' }}>
            {!filtered || filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <span className="empty-icon">📋</span>
                <p className="empty-title">No menu items yet</p>
                <button onClick={() => navigate('/restaurant/menu')} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>Setup Menu</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.625rem' }}>
                {filtered.map(item => {
                  const inCart = cart.find(c => c.menuItemId === item.id)
                  return (
                    <div key={item.id} onClick={() => addToCart(item.id, item.name, item.price)}
                      className="card" style={{ cursor: 'pointer', padding: '0.875rem', borderColor: inCart ? 'var(--primary)' : 'var(--border)', background: inCart ? 'var(--primary-light)' : 'var(--surface)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{item.name}</div>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(item.price)}</div>
                      {inCart && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>×{inCart.qty} in order</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cart panel */}
          {cart.length > 0 && (
            <div style={{ width: 190, background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: '0.875rem', flexShrink: 0 }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>Order ({cart.reduce((s,i)=>s+i.qty,0)})</h4>
              {cart.map(item => (
                <div key={item.menuItemId} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => changeQty(item.menuItemId, -1)} className="btn btn-secondary btn-icon btn-sm" style={{ padding: '0.2rem' }}>
                      {item.qty === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                    </button>
                    <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                    <button onClick={() => changeQty(item.menuItemId, 1)} className="btn btn-secondary btn-icon btn-sm" style={{ padding: '0.2rem' }}><Plus size={14} /></button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{formatCurrency(item.price * item.qty)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer with dual actions: Send to Kitchen or Pay Now */}
      {cart.length > 0 && (
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', paddingBottom: 'max(1rem,env(safe-area-inset-bottom))' }}>
          <div className="flex-between" style={{ marginBottom: '0.625rem', fontWeight: 700, fontSize: '1.125rem' }}>
            <span>Total: {formatCurrency(total)}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{cart.reduce((s,i)=>s+i.qty,0)} items</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={() => handleCreateOrder(false)}
              disabled={saving}
              className="btn btn-secondary btn-lg"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
            >
              <Utensils size={18} /> Kitchen (Open)
            </button>
            <button
              onClick={() => setShowPayModal(true)}
              disabled={saving}
              className="btn btn-primary btn-lg"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
            >
              <CreditCard size={18} /> Pay & Record Sale
            </button>
          </div>
        </div>
      )}

      {/* Payment Selection Modal for Pay Now */}
      {showPayModal && (
        <div className="modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '0.5rem' }}>💰 Complete & Record Sale</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Amount to receive: <strong style={{ color: 'var(--primary)', fontSize: '1.125rem' }}>{formatCurrency(total)}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <label className="input-label">Payment Method</label>
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
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowPayModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={() => {
                  setShowPayModal(false)
                  handleCreateOrder(true)
                }}
                disabled={saving}
              >
                {saving ? 'Recording…' : '✅ Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
