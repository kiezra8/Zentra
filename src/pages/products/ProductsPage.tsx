import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus, Search, Package, Edit3, Trash2, Calendar,
  Sparkles, ArrowDownToLine
} from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { generateId } from '@/utils/deviceId'
import { getPresetForCategory, STOCK_CATALOG_PRESETS } from '@/utils/stockCatalogPresets'
import type { Product } from '@/types'

type FilterTab = 'all' | 'low_stock' | 'expiring' | 'out_of_stock'

export default function ProductsPage() {
  const { activeBusiness } = useBusinessStore()
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)

  // Product Form states
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [sku, setSku] = useState('')
  const [buyingPrice, setBuyingPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [minStock, setMinStock] = useState('5')
  const [expiryDate, setExpiryDate] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [loading, setLoading] = useState(false)

  // Restock Form states
  const [restockQty, setRestockQty] = useState('')
  const [restockCost, setRestockCost] = useState('')
  const [restockReason, setRestockReason] = useState('purchase')

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

  // Extract unique categories for category filtering
  const existingCategories = Array.from(
    new Set(
      (products ?? [])
        .map(p => p.description?.startsWith('cat:') ? p.description.replace('cat:', '') : '')
        .filter(Boolean)
    )
  )

  const filtered = (products ?? []).filter(p => {
    if (filterTab === 'low_stock' && (p.stock_qty > p.min_stock || p.stock_qty <= 0)) return false
    if (filterTab === 'out_of_stock' && p.stock_qty > 0) return false
    if (filterTab === 'expiring') {
      if (!p.expiry_date) return false
      const isExpired = p.expiry_date <= now
      const isExpiringSoon = p.expiry_date > now && p.expiry_date - now <= thirtyDaysMs
      if (!isExpired && !isExpiringSoon) return false
    }

    if (selectedCategory !== 'all') {
      const pCat = p.description?.startsWith('cat:') ? p.description.replace('cat:', '') : ''
      if (pCat !== selectedCategory) return false
    }

    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
  })

  const totalItemsCount = products?.length ?? 0
  const outOfStockCount = (products ?? []).filter(p => p.stock_qty <= 0).length
  const lowStockCount = (products ?? []).filter(p => p.stock_qty > 0 && p.stock_qty <= p.min_stock).length
  const expiringCount = (products ?? []).filter(p => p.expiry_date && p.expiry_date - now <= thirtyDaysMs).length

  // Financial Stock Calculations
  const totalStockCost = (products ?? []).reduce((s, p) => s + Math.max(0, p.stock_qty) * p.buying_price, 0)
  const totalStockRevenue = (products ?? []).reduce((s, p) => s + Math.max(0, p.stock_qty) * p.selling_price, 0)
  const potentialProfit = totalStockRevenue - totalStockCost

  const activePreset = getPresetForCategory(activeBusiness?.category)

  function handleOpenModal(prod?: Product) {
    if (prod) {
      setEditingProduct(prod)
      setName(prod.name)
      const cat = prod.description?.startsWith('cat:') ? prod.description.replace('cat:', '') : ''
      setCategory(cat)
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
      setCategory('')
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

  function handleOpenRestock(prod: Product) {
    setRestockProduct(prod)
    setRestockQty('')
    setRestockCost(prod.buying_price.toString())
    setRestockReason('purchase')
    setShowRestockModal(true)
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
    const desc = category.trim() ? `cat:${category.trim()}` : undefined

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
        description: desc,
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
        description: desc,
        is_active: true,
        created_at: updatedNow,
        updated_at: updatedNow,
        ...buildSyncMeta(),
      }
      await db.products.add(product)
    }

    setShowModal(false)
    setLoading(false)

    if (activeBusiness?.id) {
      const { runSync } = await import('@/services/sync/syncEngine')
      runSync(activeBusiness.id).catch(console.error)
    }
  }

  async function handleSaveRestock(e: React.FormEvent) {
    e.preventDefault()
    if (!restockProduct || !activeBusiness) return
    const addQty = parseFloat(restockQty || '0')
    if (isNaN(addQty) || addQty === 0) return

    setLoading(true)
    const now = Date.now()
    const newQty = Math.max(0, restockProduct.stock_qty + addQty)
    const newCost = parseFloat(restockCost) || restockProduct.buying_price

    await db.products.update(restockProduct.id, {
      stock_qty: newQty,
      buying_price: newCost,
      updated_at: now,
      sync_status: 'pending',
    })

    // If it's a purchase/restock with cost, automatically record in expenses optionally if desired
    if (restockReason === 'purchase' && newCost > 0 && addQty > 0) {
      const totalExpense = newCost * addQty
      try {
        await db.expenses.add({
          id: generateId(),
          business_id: activeBusiness.id,
          category_id: 'stock',
          category_name: 'Stock / Purchases',
          amount: totalExpense,
          payment_method: 'cash',
          description: `Restocked ${addQty} ${restockProduct.unit || 'pcs'} of ${restockProduct.name}`,
          created_at: now,
          updated_at: now,
          ...buildSyncMeta(),
        })
      } catch (err) {
        console.warn('Could not auto-log stock purchase expense:', err)
      }
    }

    setLoading(false)
    setShowRestockModal(false)

    if (activeBusiness?.id) {
      const { runSync } = await import('@/services/sync/syncEngine')
      runSync(activeBusiness.id).catch(console.error)
    }
  }

  async function handleQuickAdjustQty(prod: Product, delta: number, e: React.MouseEvent) {
    e.stopPropagation()
    const newQty = Math.max(0, prod.stock_qty + delta)
    await db.products.update(prod.id, {
      stock_qty: newQty,
      updated_at: Date.now(),
      sync_status: 'pending',
    })
    if (activeBusiness?.id) {
      const { runSync } = await import('@/services/sync/syncEngine')
      runSync(activeBusiness.id).catch(console.error)
    }
  }

  async function handleDeleteProduct(id: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      await db.products.update(id, {
        deleted_at: Date.now(),
        sync_status: 'pending',
      })
      if (activeBusiness?.id) {
        const { runSync } = await import('@/services/sync/syncEngine')
        runSync(activeBusiness.id).catch(console.error)
      }
    }
  }

  async function handleLoadCategoryPreset(presetKey: string) {
    if (!activeBusiness) return
    setLoading(true)
    const preset = STOCK_CATALOG_PRESETS[presetKey] || activePreset
    const now = Date.now()

    for (const item of preset.items) {
      const product: Product = {
        id: generateId(),
        business_id: activeBusiness.id,
        name: item.name,
        sku: item.sku,
        buying_price: item.buying_price,
        selling_price: item.selling_price,
        stock_qty: item.stock_qty,
        min_stock: item.min_stock,
        unit: item.unit,
        description: `cat:${item.category}`,
        is_active: true,
        created_at: now,
        updated_at: now,
        ...buildSyncMeta(),
      }
      await db.products.add(product)
    }

    setLoading(false)
    setShowPresetModal(false)

    if (activeBusiness?.id) {
      const { runSync } = await import('@/services/sync/syncEngine')
      runSync(activeBusiness.id).catch(console.error)
    }
  }

  return (
    <div className="page-container">
      {/* Title & Top Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2>📦 Stock & Inventory</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Catalogue, inventory valuation & stock replenishment
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPresetModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.375rem' }}
          >
            <Sparkles size={15} style={{ color: 'var(--primary)' }} /> Quick Setup
          </button>
          <button onClick={() => handleOpenModal()} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Financial Valuation Summary Card */}
      <div className="card" style={{ padding: '1.125rem 1.25rem', marginBottom: '1.25rem', background: 'var(--surface)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Cost Value</p>
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

      {/* Empty State / Prompt for quick starter stock */}
      {totalItemsCount === 0 && (
        <div className="card" style={{
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.08) 0%, rgba(51, 153, 255, 0.04) 100%)',
          border: '1.5px dashed var(--primary)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Sparkles size={18} style={{ color: 'var(--primary)' }} />
              1-Click Stock Setup ({activePreset.title})
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Populate your inventory with {activePreset.items.length} starter stock items tailored for your business category.
            </p>
          </div>
          <button
            onClick={() => handleLoadCategoryPreset(activeBusiness?.category || 'general')}
            disabled={loading}
            className="btn btn-primary btn-sm"
            style={{ whiteSpace: 'nowrap' }}
          >
            ⚡ Load Starter Stock
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1rem' }}>
        <button className={`tab-item ${filterTab === 'all' ? 'active' : ''}`} onClick={() => setFilterTab('all')}>
          All ({totalItemsCount})
        </button>
        <button className={`tab-item ${filterTab === 'low_stock' ? 'active' : ''}`} onClick={() => setFilterTab('low_stock')}>
          Low Stock ({lowStockCount})
        </button>
        <button className={`tab-item ${filterTab === 'out_of_stock' ? 'active' : ''}`} onClick={() => setFilterTab('out_of_stock')}>
          Out ({outOfStockCount})
        </button>
        <button className={`tab-item ${filterTab === 'expiring' ? 'active' : ''}`} onClick={() => setFilterTab('expiring')}>
          Expiring ({expiringCount})
        </button>
      </div>

      {/* Category Tags if available */}
      {existingCategories.length > 0 && (
        <div style={{
          display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.75rem',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 16, fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
          >
            All Categories
          </button>
          {existingCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 16, fontSize: '0.75rem', padding: '0.25rem 0.75rem', whiteSpace: 'nowrap' }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="search"
          className="input"
          placeholder="Search product name, category, or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.75rem' }}
        />
      </div>

      {/* Products List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!filtered.length ? (
          <div className="empty-state" style={{ padding: '3.5rem 1.5rem' }}>
            <span className="empty-icon">📦</span>
            <p className="empty-title">No products match filter</p>
            <p className="empty-desc">Add products or load a starter catalogue to begin tracking stock</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setShowPresetModal(true)} className="btn btn-secondary btn-sm">
                ⚡ Quick Stock Setup
              </button>
              <button onClick={() => handleOpenModal()} className="btn btn-primary btn-sm">
                <Plus size={16} /> Add Product
              </button>
            </div>
          </div>
        ) : (
          filtered.map((p, i) => {
            const isOutOfStock = p.stock_qty <= 0
            const isLowStock = p.stock_qty > 0 && p.stock_qty <= p.min_stock
            const margin = p.selling_price - p.buying_price
            const pCategory = p.description?.startsWith('cat:') ? p.description.replace('cat:', '') : ''

            // Expiry status
            const isExpired = p.expiry_date ? p.expiry_date <= now : false
            const isExpiringSoon = p.expiry_date ? p.expiry_date > now && p.expiry_date - now <= thirtyDaysMs : false

            return (
              <div
                key={p.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  background: isOutOfStock ? 'rgba(239, 68, 68, 0.03)' : undefined,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: isExpired || isOutOfStock ? 'var(--danger-light)' : isExpiringSoon || isLowStock ? 'var(--warning-light)' : 'var(--primary-light)',
                  color: isExpired || isOutOfStock ? 'var(--danger)' : isExpiringSoon || isLowStock ? '#B45309' : 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Package size={22} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {p.name}
                    {pCategory && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--surface-3)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                        {pCategory}
                      </span>
                    )}

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

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>Qty:</span>
                      <button
                        onClick={e => handleQuickAdjustQty(p, -1, e)}
                        title="Reduce by 1"
                        style={{ background: 'var(--surface-3)', border: 'none', borderRadius: 4, padding: '0.1rem 0.3rem', cursor: 'pointer', display: 'flex' }}
                      >
                        -
                      </button>
                      <strong style={{ color: isOutOfStock ? 'var(--danger)' : isLowStock ? '#B45309' : 'var(--text-primary)', minWidth: 20, textAlign: 'center' }}>
                        {p.stock_qty}
                      </strong>
                      <button
                        onClick={e => handleQuickAdjustQty(p, 1, e)}
                        title="Increase by 1"
                        style={{ background: 'var(--surface-3)', border: 'none', borderRadius: 4, padding: '0.1rem 0.3rem', cursor: 'pointer', display: 'flex' }}
                      >
                        +
                      </button>
                      <span>{p.unit}</span>
                    </div>

                    <span>Cost: UGX {p.buying_price.toLocaleString()}</span>

                    {p.expiry_date && (
                      <span style={{ color: isExpired ? 'var(--danger)' : isExpiringSoon ? '#B45309' : undefined }}>
                        Exp: {formatDate(p.expiry_date)}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    {formatCurrency(p.selling_price)}
                  </div>
                  {margin > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                      +{formatCurrency(margin)} margin
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', marginTop: 6 }}>
                    <button
                      onClick={() => handleOpenRestock(p)}
                      className="btn btn-secondary btn-sm"
                      title="Restock / Add Stock"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}
                    >
                      <ArrowDownToLine size={13} style={{ marginRight: 3 }} /> Restock
                    </button>
                    <button
                      onClick={() => handleOpenModal(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
                      title="Edit Product"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.25rem' }}
                      title="Delete Product"
                    >
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
                <input
                  id="prod-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Sugar 1kg, Paracetamol 500mg, Engine Oil 1L"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-cat">Category (Optional)</label>
                  <input
                    id="prod-cat"
                    type="text"
                    className="input"
                    placeholder="e.g. Groceries, Medicine, Drinks"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-sku">SKU / Barcode</label>
                  <input
                    id="prod-sku"
                    type="text"
                    className="input"
                    placeholder="e.g. 890123"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-buy">Buying Price (Cost)</label>
                  <input
                    id="prod-buy"
                    type="number"
                    inputMode="numeric"
                    className="input"
                    placeholder="0"
                    value={buyingPrice}
                    onChange={e => setBuyingPrice(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-sell">Selling Price</label>
                  <input
                    id="prod-sell"
                    type="number"
                    inputMode="numeric"
                    className="input"
                    placeholder="0"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-qty">Current Stock</label>
                  <input
                    id="prod-qty"
                    type="number"
                    inputMode="numeric"
                    className="input"
                    placeholder="0"
                    value={stockQty}
                    onChange={e => setStockQty(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-min">Min Alert Qty</label>
                  <input
                    id="prod-min"
                    type="number"
                    inputMode="numeric"
                    className="input"
                    placeholder="5"
                    value={minStock}
                    onChange={e => setMinStock(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="prod-unit">Unit</label>
                  <input
                    id="prod-unit"
                    type="text"
                    className="input"
                    placeholder="pcs"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="prod-exp">
                  <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Expiry Date <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input
                  id="prod-exp"
                  type="date"
                  className="input"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Saving…' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock / Add Stock Modal */}
      {showRestockModal && restockProduct && (
        <div className="modal-backdrop" onClick={() => setShowRestockModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '0.5rem' }}>📦 Restock Product</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {restockProduct.name} (Current: <strong>{restockProduct.stock_qty} {restockProduct.unit}</strong>)
            </p>

            <form onSubmit={handleSaveRestock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="restock-qty">Quantity Added</label>
                <input
                  id="restock-qty"
                  type="number"
                  inputMode="numeric"
                  className="input"
                  placeholder="e.g. 20"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="restock-cost">Cost Price per {restockProduct.unit || 'pc'}</label>
                <input
                  id="restock-cost"
                  type="number"
                  inputMode="numeric"
                  className="input"
                  value={restockCost}
                  onChange={e => setRestockCost(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="restock-reason">Reason</label>
                <select
                  id="restock-reason"
                  className="input"
                  value={restockReason}
                  onChange={e => setRestockReason(e.target.value)}
                >
                  <option value="purchase">New Supplier Purchase (Auto-record Expense)</option>
                  <option value="restock">Direct Restock</option>
                  <option value="audit">Physical Stock Count Adjustment</option>
                  <option value="return">Customer Return</option>
                </select>
              </div>

              {parseFloat(restockQty || '0') > 0 && (
                <div style={{ padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 10, fontSize: '0.8125rem' }}>
                  New Stock Level will be: <strong>{restockProduct.stock_qty + parseFloat(restockQty || '0')} {restockProduct.unit}</strong>
                  {restockReason === 'purchase' && parseFloat(restockCost || '0') > 0 && (
                    <div>Total Cost Recorded: <strong>{formatCurrency(parseFloat(restockCost || '0') * parseFloat(restockQty || '0'))}</strong></div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowRestockModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading || !restockQty}>
                  {loading ? 'Updating…' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Setup Starter Presets Modal */}
      {showPresetModal && (
        <div className="modal-backdrop" onClick={() => setShowPresetModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Sparkles size={20} style={{ color: 'var(--primary)' }} />
              <h3>Quick Stock Starter Catalog</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Select your business catalog to populate realistic starter products with buying costs, selling prices, and default stock units.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {Object.entries(STOCK_CATALOG_PRESETS).map(([key, preset]) => {
                const isCurrentCategory = (activeBusiness?.category || 'general') === key
                return (
                  <button
                    key={key}
                    onClick={() => handleLoadCategoryPreset(key)}
                    disabled={loading}
                    className="card"
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: isCurrentCategory ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: isCurrentCategory ? 'var(--primary-light)' : 'var(--surface)',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: isCurrentCategory ? 'var(--primary)' : 'var(--text-primary)' }}>
                        {preset.title} {isCurrentCategory && '⭐ (Recommended)'}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {preset.description} ({preset.items.length} items)
                      </div>
                    </div>
                    <span className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                      Load
                    </span>
                  </button>
                )
              })}
            </div>

            <button type="button" className="btn btn-ghost btn-full" onClick={() => setShowPresetModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
