import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Loader2, ChevronDown, Plus, Minus, Package, Printer, CheckCircle } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { generateId } from '@/utils/deviceId'
import { formatCurrency } from '@/utils/currency'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/business'
import type { Sale, SaleItem, Product } from '@/types'
import ReceiptModal from '@/components/ui/ReceiptModal'

interface CartItem {
  product: Product
  quantity: number
}

export default function AddSalePage() {
  const navigate = useNavigate()
  const { activeBusiness } = useBusinessStore()

  // Mode: 'cart' (product catalog) or 'quick' (manual amount)
  const [saleMode, setSaleMode] = useState<'cart' | 'quick'>('cart')

  // Quick mode states
  const [customAmount, setCustomAmount] = useState('')
  const [description, setDescription] = useState('')

  // Cart mode states
  const [cart, setCart] = useState<CartItem[]>([])

  // Shared states
  const [discount, setDiscount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Receipt modal state
  const [savedSale, setSavedSale] = useState<Sale | null>(null)
  const [savedItems, setSavedItems] = useState<SaleItem[]>([])
  const [showReceipt, setShowReceipt] = useState(false)

  // Live products catalogue query
  const products = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.products
      .where('business_id').equals(activeBusiness.id)
      .filter(p => !p.deleted_at && p.is_active)
      .toArray()
  }, [activeBusiness?.id])

  // Compute total
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0)
  const subtotal = saleMode === 'cart' ? cartSubtotal : parseFloat(customAmount || '0')
  const totalDiscount = parseFloat(discount || '0')
  const finalTotal = Math.max(0, subtotal - totalDiscount)

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function updateCartQty(productId: string, delta: number) {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta
            return newQty > 0 ? { ...item, quantity: newQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusiness || finalTotal <= 0) return
    setLoading(true)

    const now = Date.now()
    const saleId = generateId()

    // 1. Create Sale record
    const sale: Sale = {
      id: saleId,
      business_id: activeBusiness.id,
      total: finalTotal,
      subtotal,
      discount: totalDiscount,
      tax: 0,
      payment_method: paymentMethod,
      notes: notes.trim() || description.trim() || undefined,
      receipt_no: `S${Date.now().toString().slice(-6)}`,
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }
    await db.sales.add(sale)

    const itemsToSave: SaleItem[] = []

    // 2. Process cart products (automatic stock decrease & sale items creation)
    if (saleMode === 'cart') {
      for (const item of cart) {
        const saleItem: SaleItem = {
          id: generateId(),
          sale_id: saleId,
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.selling_price,
          discount: 0,
          total: item.product.selling_price * item.quantity,
        }
        await db.saleItems.add(saleItem)
        itemsToSave.push(saleItem)

        // AUTOMATICALLY DECREASE PRODUCT STOCK QTY IN DEXIE!
        const currentProduct = await db.products.get(item.product.id)
        if (currentProduct) {
          const newStock = Math.max(0, currentProduct.stock_qty - item.quantity)
          await db.products.update(item.product.id, {
            stock_qty: newStock,
            updated_at: now,
            sync_status: 'pending',
          })
        }
      }
    }

    setSavedSale(sale)
    setSavedItems(itemsToSave)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-3)' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.375rem', borderRadius: 8, color: 'var(--text-secondary)', display: 'flex' }}>
          <ChevronDown size={22} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <h2 style={{ fontSize: '1.0625rem' }}>Record Sale</h2>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {savedSale ? (
          <div style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <CheckCircle size={56} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
            <h2 style={{ color: 'var(--success)', marginBottom: '0.25rem' }}>Sale Completed!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Receipt #{savedSale.receipt_no} • {formatCurrency(savedSale.total)}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 320, margin: '0 auto' }}>
              {activeBusiness && (
                <button
                  type="button"
                  onClick={() => setShowReceipt(true)}
                  className="btn btn-primary btn-lg btn-full"
                  style={{ gap: '0.5rem' }}
                >
                  <Printer size={20} /> Print Thermal Receipt
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/sales')}
                className="btn btn-secondary btn-lg btn-full"
              >
                Back to Sales List
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Sale Mode Selector */}
            <div className="tab-bar">
              <button
                type="button"
                className={`tab-item ${saleMode === 'cart' ? 'active' : ''}`}
                onClick={() => setSaleMode('cart')}
              >
                📦 Select Products (Auto-Stock)
              </button>
              <button
                type="button"
                className={`tab-item ${saleMode === 'quick' ? 'active' : ''}`}
                onClick={() => setSaleMode('quick')}
              >
                ⚡ Fast Quick Amount
              </button>
            </div>

            {/* CART MODE: Product Catalogue Selection */}
            {saleMode === 'cart' && (
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Tap product to add to cart:
                </h4>

                {!products?.length ? (
                  <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                      No products added to catalogue yet.
                    </p>
                    <button type="button" onClick={() => setSaleMode('quick')} className="btn btn-secondary btn-sm">
                      Switch to Quick Amount Entry
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem', marginBottom: '1rem', maxHeight: 220, overflowY: 'auto' }}>
                    {products.map(p => {
                      const cartQty = cart.find(i => i.product.id === p.id)?.quantity ?? 0
                      return (
                        <button
                          key={p.id} type="button"
                          onClick={() => addToCart(p)}
                          style={{
                            background: cartQty > 0 ? 'var(--primary-light)' : 'var(--surface)',
                            border: `1.5px solid ${cartQty > 0 ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: 12, padding: '0.75rem', textAlign: 'left',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 700, marginTop: 2 }}>{formatCurrency(p.selling_price)}</div>
                          <div style={{ fontSize: '0.75rem', color: p.stock_qty <= p.min_stock ? 'var(--danger)' : 'var(--text-muted)', marginTop: 2 }}>
                            Stock: {p.stock_qty} {p.unit} {cartQty > 0 && `(Added: ${cartQty})`}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Selected Cart Items Summary */}
                {cart.length > 0 && (
                  <div className="card" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Selected Cart ({cart.length} items)</h4>
                    {cart.map(item => (
                      <div key={item.product.id} className="flex-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.product.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatCurrency(item.product.selling_price)} each</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button type="button" onClick={() => updateCartQty(item.product.id, -1)} className="btn btn-secondary btn-sm btn-icon" style={{ minHeight: 32, width: 32 }}>
                            <Minus size={14} />
                          </button>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{item.quantity}</span>
                          <button type="button" onClick={() => updateCartQty(item.product.id, 1)} className="btn btn-secondary btn-sm btn-icon" style={{ minHeight: 32, width: 32 }}>
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QUICK MODE: Custom Amount Input */}
            {saleMode === 'quick' && (
              <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Amount Received (UGX)</p>
                <input
                  type="number" inputMode="numeric" pattern="[0-9]*"
                  className="input"
                  placeholder="0"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  required={saleMode === 'quick'}
                  autoFocus
                  style={{
                    textAlign: 'center', fontSize: '2.25rem', fontWeight: 800,
                    border: 'none', background: 'none', outline: 'none',
                    letterSpacing: '-0.03em', color: 'var(--success)',
                    width: '100%', padding: 0,
                  }}
                />
                <div style={{ width: '80%', height: 2, background: 'var(--border)', margin: '0.75rem auto 0' }} />
              </div>
            )}

            {/* Common Details Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {saleMode === 'quick' && (
                <div className="input-group">
                  <label className="input-label" htmlFor="sale-desc">Description / Item <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                  <input id="sale-desc" type="text" className="input" placeholder="e.g. Bread, Airtime, Service…" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              )}

              {/* Discount */}
              <div className="input-group">
                <label className="input-label" htmlFor="sale-discount">Discount (UGX) <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input id="sale-discount" type="number" inputMode="numeric" className="input" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
              </div>

              {/* Payment method */}
              <div className="input-group">
                <label className="input-label">Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm.value} type="button"
                      onClick={() => setPaymentMethod(pm.value)}
                      style={{
                        padding: '0.625rem', borderRadius: 10, border: '1.5px solid',
                        borderColor: paymentMethod === pm.value ? 'var(--primary)' : 'var(--border)',
                        background: paymentMethod === pm.value ? 'var(--primary-light)' : 'var(--surface)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.8125rem', fontWeight: paymentMethod === pm.value ? 600 : 400,
                        color: paymentMethod === pm.value ? 'var(--primary)' : 'var(--text-primary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>{pm.emoji}</span>{pm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            {finalTotal > 0 && (
              <div className="card" style={{ background: 'var(--success-light)', border: '1px solid var(--success)' }}>
                <div className="flex-between">
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>Total Payable</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
                    UGX {finalTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading || finalTotal <= 0} style={{ marginTop: '0.25rem' }}>
              {loading ? <Loader2 size={20} className="animate-spin" /> : '💰 Complete & Save Sale'}
            </button>
          </form>
        )}

        {/* Receipt Modal */}
        {showReceipt && savedSale && activeBusiness && (
          <ReceiptModal
            sale={savedSale}
            saleItems={savedItems}
            business={activeBusiness}
            onClose={() => setShowReceipt(false)}
          />
        )}
      </div>
    </div>
  )
}
