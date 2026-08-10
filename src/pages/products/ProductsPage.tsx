import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, Package, AlertTriangle, Edit3, Trash2, Calendar, DollarSign, Clock } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { generateId } from '@/utils/deviceId'
import type { Product } from '@/types'

type FilterTab = 'all' | 'low_stock' | 'expiring'

export default function ProductsPage() {
  const { activeBusiness } = useBusinessStore()
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [buyingPrice, setBuyingPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [minStock, setMinStock] = useState('5')
  const [expiryDate, setExpiryDate] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [loading, setLoading] = useState(false)

  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  const products = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.products
      .where('business_id').equals(activeBusiness.id)
      .filter(p => !p.deleted_at && p.is_active)
      .reverse()
      .toArray()
  }, [activeBusiness?.id])

  const filtered = (products ?? []).filter(p => {
    if (filterTab === 'low_stock' && p.stock_qty > p.min_stock) return false
    if (filterTab === 'expiring') {
      if (!p.expiry_date) return false
      const isExpired = p.expiry_date <= now
      const isExpiringSoon = p.expiry_date > now && p.expiry_date - now <= thirtyDaysMs
      if (!isExpired && !isExpiringSoon) return false
    }
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
  })

  const lowStockCount = (products ?? []).filter(p => p.stock_qty <= p.min_stock).length
  const expiringCount = (products ?? []).filter(p => p.expiry_date && p.expiry_date - now <= thirtyDaysMs).length

  // Financial Stock Calculations
  const totalStockCost = (products ?? []).reduce((s, p) => s + p.stock_qty * p.buying_price, 0)
  const totalStockRevenue = (products ?? []).reduce((s, p) => s + p.stock_qty * p.selling_price, 0)
  const potentialProfit = totalStockRevenue - totalStockCost

  function handleOpenModal(prod?: Product) {
    if (prod) {
      setEditingProduct(prod)
      setName(prod.name)
      setSku(prod.sku || '')
      setBuyingPrice(prod.buying_price.toString())
      setSellingPrice(prod.selling_price.toString())
      setStockQty(prod.stock_qty.toString())
      setMinStock(prod.min_stock.toString())
      setExpiryDate(prod.expiry_date ? new Date(prod.expiry_date).toISOString().split('T')[0] : '')
      setUnit(prod.unit || 'pcs')
    } else {
      setEditingProduct(null)
      setName('')
      setSku('')
      setBuyingPrice('')
      setSellingPrice('')
      setStockQty('')
      setMinStock('5')
      setExpiryDate('')
      setUnit('pcs')
    }
    setShowModal(true)
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusiness || !name.trim()) return
    setLoading(true)

    const updatedNow = Date.now()
    const buy = parseFloat(buyingPrice || '0')
    const sell = parseFloat(sellingPrice || '0')
    const qty = parseFloat(stockQty || '0')
    const min = parseFloat(minStock || '5')
    const exp = expiryDate ? new Date(expiryDate).getTime() : undefined

    if (editingProduct) {
      await db.products.update(editingProduct.id, {
        name: name.trim(),
        sku: sku.trim() || undefined,
        buying_price: buy,
        selling_price: sell,
        stock_qty: qty,
        min_stock: min,
        expiry_date: exp,
        unit: unit.trim() || 'pcs',
        updated_at: updatedNow,
        sync_status: 'pending',
      })
    } else {
      const product: Product = {
        id: generateId(),
        business_id: activeBusiness.id,
        name: name.trim(),
        sku: sku.trim() || undefined,
        buying_price: buy,
        selling_price: sell,
        stock_qty: qty,
        min_stock: min,
        expiry_date: exp,
        unit: unit.trim() || 'pcs',
        is_active: true,
        created_at: updatedNow,
        updated_at: updatedNow,
        ...buildSyncMeta(),
      }
      await db.products.add(product)
    }

    setShowModal(false)
    setLoading(false)
  }

  async function handleDeleteProduct(id: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      await db.products.update(id, {
        deleted_at: Date.now(),
        sync_status: 'pending',
      })
    }
  }

  return (
    <div className="page-container">
      {/* Title */}
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>Stock & Products</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Inventory catalogue, expiry & valuation</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Financial Valuation Summary Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'var(--surface)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Cost Bought</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {formatCurrency(totalStockCost)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Revenue</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>
              {formatCurrency(totalStockRevenue)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Potential Profit</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
              +{formatCurrency(potentialProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1rem' }}>
        <button className={`tab-item ${filterTab === 'all' ? 'active' : ''}`} onClick={() => setFilterTab('all')}>
          All ({products?.length ?? 0})
        </button>
        <button className={`tab-item ${filterTab === 'low_stock' ? 'active' : ''}`} onClick={() => setFilterTab('low_stock')}>
          Low Stock ({lowStockCount})
        </button>
        <button className={`tab-item ${filterTab === 'expiring' ? 'active' : ''}`} onClick={() => setFilterTab('expiring')}>
          Expiring ({expiringCount})
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="search" className="input" placeholder="Search product name or SKU…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.75rem' }} />
      </div>

      {/* Products List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!filtered.length ? (
          <div className="empty-state">
            <span className="empty-icon">📦</span>
            <p className="empty-title">No products match filter</p>
            <p className="empty-desc">Add products or clear filters to view items</p>
            <button onClick={() => handleOpenModal()} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
              <Plus size={16} /> Add First Product
            </button>
          </div>
        ) : (
          filtered.map((p, i) => {
            const isOutOfStock = p.stock_qty <= 0
            const isLowStock = p.stock_qty <= p.min_stock
            const margin = p.selling_price - p.buying_price

            // Expiry status
            const isExpired = p.expiry_date ? p.expiry_date <= now : false
            const isExpiringSoon = p.expiry_date ? p.expiry_date > now && p.expiry_date - now <= thirtyDaysMs : false

            return (
              <div key={p.id} style={{ padding: '1rem 1.25rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: isExpired ? 'var(--danger-light)' : isExpiringSoon || isLowStock ? 'var(--warning-light)' : 'var(--primary-light)',
                  color: isExpired ? 'var(--danger)' : isExpiringSoon || isLowStock ? '#B45309' : 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Package size={22} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {p.name}
                    {isOutOfStock ? (
                      <span className="badge badge-danger">Out of Stock</span>
                    ) : isLowStock ? (
                      <span className="badge badge-warning">Low Stock</span>
                    ) : null}

                    {isExpired ? (
                      <span className="badge badge-danger">⚠️ Expired</span>
                    ) : isExpiringSoon ? (
                      <span className="badge badge-warning">⏳ Expiring Soon</span>
                    ) : null}
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: 3 }}>
                    <span>Stock: <strong style={{ color: 'var(--text-primary)' }}>{p.stock_qty} {p.unit}</strong></span>
                    <span>Cost: UGX {p.buying_price.toLocaleString()}</span>
                    {p.expiry_date && (
                      <span style={{ color: isExpired ? 'var(--danger)' : isExpiringSoon ? '#B45309' : undefined }}>
                        Exp: {formatDate(p.expiry_date)}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    {formatCurrency(p.selling_price)}
                  </div>
                  {margin > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                      +{formatCurrency(margin)} margin
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={() => handleOpenModal(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '1rem' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="prod-name">Product Name</label>
                <input id="prod-name" type="text" className="input" placeholder="e.g. Bread 500g, Milk 1L, Panadol" value={name} onChange={e => setName(e.target.value)} required autoFocus />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-buy">Buying Price (Cost)</label>
                  <input id="prod-buy" type="number" inputMode="numeric" className="input" placeholder="0" value={buyingPrice} onChange={e => setBuyingPrice(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-sell">Selling Price</label>
                  <input id="prod-sell" type="number" inputMode="numeric" className="input" placeholder="0" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-qty">Current Stock</label>
                  <input id="prod-qty" type="number" inputMode="numeric" className="input" placeholder="0" value={stockQty} onChange={e => setStockQty(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-min">Min Alert Qty</label>
                  <input id="prod-min" type="number" inputMode="numeric" className="input" placeholder="5" value={minStock} onChange={e => setMinStock(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-unit">Unit</label>
                  <input id="prod-unit" type="text" className="input" placeholder="pcs" value={unit} onChange={e => setUnit(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-exp">
                    <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                    Expiry Date <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                  </label>
                  <input id="prod-exp" type="date" className="input" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-sku">SKU / Barcode</label>
                  <input id="prod-sku" type="text" className="input" placeholder="e.g. 890123" value={sku} onChange={e => setSku(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Saving…' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
