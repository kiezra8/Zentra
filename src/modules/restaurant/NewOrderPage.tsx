// New Restaurant Order & POS Sale Page
// Everything sold in the restaurant (meals, fresh juices, drinks, breakfast, snacks)
// is part of the menu and recorded as an order/sale with receipts.

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Plus, Minus, Trash2, CreditCard, Utensils,
  Search, Sparkles, Receipt, CheckCircle, Tag
} from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { generateId } from '@/utils/deviceId'
import { formatCurrency } from '@/utils/currency'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/business'
import { recordOrderAsSale } from '@/services/orderSaleSync'
import type { Order, OrderItem, MenuItem } from '@/types'

interface CartItem { menuItemId: string; name: string; price: number; qty: number; category?: string }

const CATEGORY_EMOJIS: Record<string, string> = {
  all: '🍽️',
  'drinks & juices': '🥤',
  beverages: '🥤',
  'main dishes': '🍲',
  breakfast: '🍳',
  'fast food': '🍔',
  snacks: '🍟',
  desserts: '🍰',
}

const STARTER_PRESET_ITEMS: Omit<MenuItem, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'sync_status' | 'device_id' | 'version'>[] = [
  { name: 'Fresh Passion Juice (Glass)', category: 'Drinks & Juices', price: 4000, description: 'Cold freshly squeezed natural passion fruit juice', is_available: true },
  { name: 'Fresh Mango Juice (Glass)', category: 'Drinks & Juices', price: 4500, description: 'Chilled thick fresh blended mango juice', is_available: true },
  { name: 'Fresh Cocktail Juice (Glass)', category: 'Drinks & Juices', price: 5000, description: 'Blend of passion, mango, pineapple & watermelon', is_available: true },
  { name: 'African Spiced Milk Tea', category: 'Drinks & Juices', price: 3000, description: 'Hot brewed with ginger, cinnamon and fresh milk', is_available: true },
  { name: 'Assorted Soda 300ml Glass', category: 'Drinks & Juices', price: 2000, description: 'Coca-Cola, Fanta, Sprite, Stoney, Novida', is_available: true },
  { name: 'Mineral Water 500ml', category: 'Drinks & Juices', price: 1500, description: 'Chilled premium bottled drinking water', is_available: true },
  { name: 'Cold Beer / Cider', category: 'Drinks & Juices', price: 5000, description: 'Nile Special, Club, Bell, Tusker, Savanna', is_available: true },
  { name: 'Katogo (Matooke & Beef Gravy)', category: 'Breakfast', price: 7000, description: 'Fresh green matooke steamed with tender beef gravy', is_available: true },
  { name: 'Rolex (2 Eggs + Chapati)', category: 'Breakfast', price: 3500, description: 'Fried vegetable eggs rolled in fresh hot chapati', is_available: true },
  { name: 'Beef Luwombo with Matooke', category: 'Main Dishes', price: 18000, description: 'Slow-cooked seasoned beef in wrapped banana leaves', is_available: true },
  { name: 'Chicken Luwombo with Rice', category: 'Main Dishes', price: 20000, description: 'Tender local chicken steamed in fragrant banana leaf', is_available: true },
  { name: 'Beef Pilau Rice', category: 'Main Dishes', price: 12000, description: 'Fragrant spiced basmati rice with seasoned beef', is_available: true },
  { name: 'Chips & Quarter Fried Chicken', category: 'Fast Food', price: 15000, description: 'Crispy golden french fries with quarter fried chicken', is_available: true },
  { name: 'Beef Samosas (Pair of 2)', category: 'Snacks', price: 3000, description: 'Crispy deep-fried pastry filled with spiced minced meat', is_available: true },
]

export default function NewOrderPage() {
  const navigate = useNavigate()
  const { activeBusiness } = useBusinessStore()
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [tableNo, setTableNo] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [discount, setDiscount] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [menuCategory, setMenuCategory] = useState<string>('all')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [showPayModal, setShowPayModal] = useState(false)

  const menuItems = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.menuItems.where('business_id').equals(activeBusiness.id)
      .filter(m => m.is_available && !m.deleted_at).toArray()
  }, [activeBusiness?.id])

  // Extract available unique categories
  const rawCategories = Array.from(new Set(menuItems?.map(m => m.category) ?? []))
  const categories = ['all', ...rawCategories]

  // Filter items
  const filtered = menuItems?.filter(item => {
    const matchesCategory = menuCategory === 'all' || item.category.toLowerCase() === menuCategory.toLowerCase()
    const matchesSearch = !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(search.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  function addToCart(item: MenuItem) {
    setCart(c => {
      const existing = c.find(x => x.menuItemId === item.id)
      if (existing) return c.map(x => x.menuItemId === item.id ? { ...x, qty: x.qty + 1 } : x)
      return [...c, { menuItemId: item.id, name: item.name, price: item.price, qty: 1, category: item.category }]
    })
  }

  function changeQty(itemId: string, delta: number) {
    setCart(c => c.map(x => x.menuItemId === itemId ? { ...x, qty: Math.max(0, x.qty + delta) } : x).filter(x => x.qty > 0))
  }

  async function handleLoadStarterMenu() {
    if (!activeBusiness) return
    setSaving(true)
    const now = Date.now()
    for (const starter of STARTER_PRESET_ITEMS) {
      const item: MenuItem = {
        id: generateId(),
        business_id: activeBusiness.id,
        name: starter.name,
        category: starter.category,
        price: starter.price,
        description: starter.description,
        is_available: starter.is_available,
        created_at: now,
        updated_at: now,
        ...buildSyncMeta(),
      }
      await db.menuItems.add(item)
    }
    setSaving(false)

    // Trigger cloud sync
    const { runSync } = await import('@/services/sync/syncEngine')
    runSync(activeBusiness.id).catch(console.error)
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
      table_no: orderType === 'dine_in' ? (tableNo.trim() || undefined) : undefined,
      customer_name: customerName.trim() || (orderType === 'takeaway' ? 'Takeaway' : undefined),
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

    // Automatically record every order as part of sales & income
    const { recordOrderAsSale } = await import('@/services/orderSaleSync')
    await recordOrderAsSale(order, cart.map(c => ({ name: c.name, price: c.price, qty: c.qty })))

    // Trigger instant cloud sync
    const { runSync } = await import('@/services/sync/syncEngine')
    runSync(activeBusiness.id).catch(console.error)

    setSaving(false)
    navigate('/restaurant/orders')
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-3)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)', padding: '1.25rem 1.25rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '0.5rem', color: 'white', cursor: 'pointer', display: 'flex' }}>
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 800 }}>🍽️ New Order & Sale</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', marginTop: 1 }}>
                Select meals, juices, drinks & snacks from menu
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/restaurant/menu')}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
              padding: '0.4rem 0.75rem', color: 'white', cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: 600,
            }}
          >
            📋 Edit Menu
          </button>
        </div>

        {/* Order Type Tabs & Info */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setOrderType('dine_in')}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none',
              fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
              background: orderType === 'dine_in' ? 'white' : 'rgba(255,255,255,0.2)',
              color: orderType === 'dine_in' ? '#DC2626' : 'white',
            }}
          >
            🪑 Dine-in / Table
          </button>
          <button
            type="button"
            onClick={() => setOrderType('takeaway')}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none',
              fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
              background: orderType === 'takeaway' ? 'white' : 'rgba(255,255,255,0.2)',
              color: orderType === 'takeaway' ? '#DC2626' : 'white',
            }}
          >
            🛍️ Takeaway / Delivery
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem' }}>
          {orderType === 'dine_in' && (
            <input
              className="input"
              placeholder="Table No (e.g. 4)"
              value={tableNo}
              onChange={e => setTableNo(e.target.value)}
              style={{ width: 110, background: 'rgba(255,255,255,0.95)', fontWeight: 600 }}
            />
          )}
          <input
            className="input"
            placeholder={orderType === 'dine_in' ? 'Customer name (optional)' : 'Customer name / Phone'}
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.95)' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search & Category Pills */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1.25rem 0.5rem', flexShrink: 0 }}>
          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search dishes, fresh juice, drinks, snacks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem', height: 38, fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '0.25rem' }}>
            {categories.map(cat => {
              const emoji = CATEGORY_EMOJIS[cat.toLowerCase()] || '🍴'
              return (
                <button
                  key={cat}
                  onClick={() => setMenuCategory(cat)}
                  className={`btn btn-sm ${menuCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ whiteSpace: 'nowrap', borderRadius: 20, fontSize: '0.8125rem', padding: '0.3rem 0.75rem' }}
                >
                  <span style={{ marginRight: 4 }}>{emoji}</span>
                  {cat === 'all' ? 'All Items' : cat}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Menu items grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem' }}>
            {!menuItems || menuItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
                <span className="empty-icon">🍽️</span>
                <p className="empty-title">Your Restaurant Menu is Empty</p>
                <p className="empty-desc">
                  Load starter dishes, fresh juices, drinks, and meals to start taking orders and sales.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                  <button onClick={handleLoadStarterMenu} disabled={saving} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
                    <Sparkles size={15} /> ⚡ Load Starter Menu & Drinks
                  </button>
                  <button onClick={() => navigate('/restaurant/menu')} className="btn btn-secondary btn-sm">
                    Create Custom Item
                  </button>
                </div>
              </div>
            ) : filtered && filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p className="empty-title">No menu items found</p>
                <p className="empty-desc">Try clearing your search or category filter</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.625rem' }}>
                {filtered?.map(item => {
                  const inCart = cart.find(c => c.menuItemId === item.id)
                  const emoji = CATEGORY_EMOJIS[item.category?.toLowerCase() || ''] || '🍴'

                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="card"
                      style={{
                        cursor: 'pointer',
                        padding: '0.875rem',
                        borderColor: inCart ? 'var(--primary)' : 'var(--border)',
                        background: inCart ? 'var(--primary-light)' : 'var(--surface)',
                        transition: 'transform 0.1s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{emoji}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2, marginBottom: '0.35rem' }}>
                          {item.name}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.2, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.description}
                          </div>
                        )}
                      </div>

                      <div className="flex-between" style={{ marginTop: '0.5rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.875rem' }}>
                          {formatCurrency(item.price)}
                        </span>
                        {inCart ? (
                          <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '12px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
                            {inCart.qty}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>+ Add</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cart panel */}
          {cart.length > 0 && (
            <div style={{ width: 220, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '0.875rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <div className="flex-between">
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                    Order ({cart.reduce((s, i) => s + i.qty, 0)})
                  </h4>
                  <button onClick={() => setCart([])} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {cart.map(item => (
                  <div key={item.menuItemId} style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light, #f0f0f0)' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem', lineHeight: 1.2 }}>
                      {item.name}
                    </div>
                    <div className="flex-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <button onClick={() => changeQty(item.menuItemId, -1)} className="btn btn-secondary btn-icon btn-sm" style={{ width: 22, height: 22, padding: 0 }}>
                          {item.qty === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                        </button>
                        <span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center', fontSize: '0.8125rem' }}>{item.qty}</span>
                        <button onClick={() => changeQty(item.menuItemId, 1)} className="btn btn-secondary btn-icon btn-sm" style={{ width: 22, height: 22, padding: 0 }}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatCurrency(item.price * item.qty)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                  <Tag size={13} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    placeholder="Discount (UGX)"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    className="input"
                    style={{ height: 28, fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with dual actions: Send to Kitchen or Pay Now */}
      {cart.length > 0 && (
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', paddingBottom: 'max(1rem,env(safe-area-inset-bottom))' }}>
          <div className="flex-between" style={{ marginBottom: '0.625rem', fontWeight: 800, fontSize: '1.125rem' }}>
            <span>Total: <span style={{ color: 'var(--primary)' }}>{formatCurrency(total)}</span></span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              {cart.reduce((s, i) => s + i.qty, 0)} items {orderType === 'dine_in' && tableNo ? `(Table ${tableNo})` : ''}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.75rem' }}>
            <button
              onClick={() => handleCreateOrder(false)}
              disabled={saving}
              className="btn btn-secondary btn-lg"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontSize: '0.9375rem' }}
            >
              <Utensils size={18} /> Kitchen (Open)
            </button>
            <button
              onClick={() => setShowPayModal(true)}
              disabled={saving}
              className="btn btn-primary btn-lg"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontSize: '0.9375rem' }}
            >
              <CreditCard size={18} /> 💰 Pay & Complete Sale
            </button>
          </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      {showPayModal && (
        <div className="modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '0.35rem' }}>💰 Receive Payment & Complete Sale</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Amount to receive: <strong style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{formatCurrency(total)}</strong>
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
                {saving ? 'Recording…' : '✅ Confirm Payment & Record Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
