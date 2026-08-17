// Restaurant Menu Management Page — Full menu catalog, live availability & presets
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Edit3, Trash2,
  Sparkles, ToggleLeft, ToggleRight, ArrowRight
} from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { generateId } from '@/utils/deviceId'
import type { MenuItem } from '@/types'

const MENU_CATEGORIES = [
  { id: 'all', label: 'All Items', emoji: '🍽️' },
  { id: 'Breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'Main Dishes', label: 'Main Dishes', emoji: '🍲' },
  { id: 'Fast Food', label: 'Fast Food', emoji: '🍔' },
  { id: 'Snacks', label: 'Snacks & Bites', emoji: '🍟' },
  { id: 'Beverages', label: 'Drinks & Beverages', emoji: '🥤' },
  { id: 'Desserts', label: 'Desserts', emoji: '🍰' },
  { id: 'Specials', label: 'Chef Specials', emoji: '⭐' },
]

const STARTER_MENU_ITEMS: Omit<MenuItem, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'sync_status' | 'device_id' | 'version'>[] = [
  { name: 'Katogo (Matooke & Beef)', category: 'Breakfast', price: 7000, description: 'Fresh green matooke steamed with tender beef gravy', is_available: true },
  { name: 'Rolex (2 Eggs + Chapati)', category: 'Breakfast', price: 3500, description: 'Fried vegetable eggs rolled in fresh hot chapati', is_available: true },
  { name: 'African Spiced Milk Tea', category: 'Beverages', price: 3000, description: 'Brewed with fresh ginger, cinnamon, and fresh milk', is_available: true },
  { name: 'Beef Luwombo with Matooke', category: 'Main Dishes', price: 18000, description: 'Slow-cooked seasoned beef in wrapped banana leaves', is_available: true },
  { name: 'Chicken Luwombo with Rice', category: 'Main Dishes', price: 20000, description: 'Tender local chicken steamed in fragrant banana leaf', is_available: true },
  { name: 'Chips & Fried Chicken', category: 'Fast Food', price: 15000, description: 'Crispy golden french fries served with quarter fried chicken', is_available: true },
  { name: 'Beef Pilau Rice', category: 'Main Dishes', price: 12000, description: 'Fragrant spiced basmati rice cooked with seasoned beef chunks', is_available: true },
  { name: 'Fresh Passion Juice 500ml', category: 'Beverages', price: 4000, description: 'Freshly squeezed natural passion fruit juice', is_available: true },
  { name: 'Mineral Water 500ml', category: 'Beverages', price: 1500, description: 'Chilled premium bottled drinking water', is_available: true },
  { name: 'Assorted Soda 300ml Glass', category: 'Beverages', price: 2000, description: 'Coca-Cola, Fanta, Sprite, or Stoney', is_available: true },
  { name: 'Beef Samosas (Pair of 2)', category: 'Snacks', price: 3000, description: 'Crispy deep-fried pastry filled with spiced minced meat', is_available: true },
]

export default function RestaurantMenuPage() {
  const { activeBusiness } = useBusinessStore()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPresetConfirm, setShowPresetConfirm] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Main Dishes')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)

  const menuItems = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.menuItems
      .where('business_id').equals(activeBusiness.id)
      .filter(m => !m.deleted_at)
      .reverse()
      .toArray()
  }, [activeBusiness?.id])

  const filteredItems = (menuItems ?? []).filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return item.name.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q)
  })

  const totalItems = menuItems?.length ?? 0
  const availableCount = menuItems?.filter(m => m.is_available).length ?? 0
  const soldOutCount = totalItems - availableCount
  const avgPrice = totalItems > 0 ? Math.round(menuItems!.reduce((s, i) => s + i.price, 0) / totalItems) : 0

  function handleOpenModal(item?: MenuItem) {
    if (item) {
      setEditingItem(item)
      setName(item.name)
      setCategory(item.category || 'Main Dishes')
      setPrice(item.price.toString())
      setDescription(item.description || '')
      setIsAvailable(item.is_available)
    } else {
      setEditingItem(null)
      setName('')
      setCategory(selectedCategory !== 'all' ? selectedCategory : 'Main Dishes')
      setPrice('')
      setDescription('')
      setIsAvailable(true)
    }
    setShowModal(true)
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusiness || !name.trim()) return
    setLoading(true)

    const now = Date.now()
    const itemPrice = parseFloat(price) || 0

    if (editingItem) {
      await db.menuItems.update(editingItem.id, {
        name: name.trim(),
        category: category.trim(),
        price: itemPrice,
        description: description.trim() || undefined,
        is_available: isAvailable,
        updated_at: now,
        sync_status: 'pending',
      })
    } else {
      const newItem: MenuItem = {
        id: generateId(),
        business_id: activeBusiness.id,
        name: name.trim(),
        category: category.trim(),
        price: itemPrice,
        description: description.trim() || undefined,
        is_available: isAvailable,
        created_at: now,
        updated_at: now,
        ...buildSyncMeta(),
      }
      await db.menuItems.add(newItem)
    }

    setLoading(false)
    setShowModal(false)
  }

  async function handleToggleAvailability(item: MenuItem, e: React.MouseEvent) {
    e.stopPropagation()
    await db.menuItems.update(item.id, {
      is_available: !item.is_available,
      updated_at: Date.now(),
      sync_status: 'pending',
    })
  }

  async function handleDeleteItem(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this menu item?')) {
      await db.menuItems.update(id, {
        deleted_at: Date.now(),
        sync_status: 'pending',
      })
    }
  }

  async function handleLoadStarterMenu() {
    if (!activeBusiness) return
    setLoading(true)
    const now = Date.now()

    for (const starter of STARTER_MENU_ITEMS) {
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

    setLoading(false)
    setShowPresetConfirm(false)
  }

  return (
    <div className="page-container">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2>🍽️ Restaurant Menu</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Configure meals, beverages, pricing & availability
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/restaurant/orders/new" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', gap: '0.375rem' }}>
            Take Order <ArrowRight size={14} />
          </Link>
          <button onClick={() => handleOpenModal()} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
            <Plus size={16} /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', background: 'var(--surface)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Items</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {totalItems}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In Stock</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>
              {availableCount}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sold Out</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: soldOutCount > 0 ? 'var(--danger)' : 'var(--text-muted)', marginTop: 2 }}>
              {soldOutCount}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Price</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
              {formatCurrency(avgPrice)}
            </p>
          </div>
        </div>
      </div>

      {/* Starter Menu Prompt if empty */}
      {totalItems === 0 && (
        <div className="card" style={{
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(239, 68, 68, 0.04) 100%)',
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
              Quick Menu Setup
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Load 11 popular restaurant items (Katogo, Luwombo, Pilau, Chips & Chicken, Drinks) with 1 click to get started immediately.
            </p>
          </div>
          <button
            onClick={() => setShowPresetConfirm(true)}
            disabled={loading}
            className="btn btn-primary btn-sm"
            style={{ whiteSpace: 'nowrap' }}
          >
            ⚡ Load Starter Menu
          </button>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div style={{
        display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {MENU_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`btn btn-sm ${selectedCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap', borderRadius: 20, padding: '0.4rem 0.875rem' }}
          >
            <span style={{ marginRight: '0.25rem' }}>{cat.emoji}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="search"
          className="input"
          placeholder="Search meals, drinks, or ingredients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.75rem' }}
        />
      </div>

      {/* Menu Item Grid */}
      {!filteredItems.length ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
          <div className="empty-state" style={{ padding: '3.5rem 1.5rem' }}>
            <span className="empty-icon">🍽️</span>
            <p className="empty-title">No menu items found</p>
            <p className="empty-desc">Add delicious dishes to your menu or use the starter template</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setShowPresetConfirm(true)} className="btn btn-secondary btn-sm">
                ⚡ Load Starter Menu
              </button>
              <button onClick={() => handleOpenModal()} className="btn btn-primary btn-sm">
                <Plus size={16} /> Add First Item
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem', marginBottom: '5rem' }}>
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: '1.125rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: item.is_available ? 'var(--border)' : 'var(--danger-light)',
                background: item.is_available ? 'var(--surface)' : 'var(--surface-2)',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: item.is_available ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {item.name}
                  </div>
                  <button
                    onClick={e => handleToggleAvailability(item, e)}
                    title={item.is_available ? 'Click to mark Sold Out' : 'Click to mark In Stock'}
                    style={{
                      background: item.is_available ? 'var(--success-light)' : 'var(--danger-light)',
                      color: item.is_available ? 'var(--success)' : 'var(--danger)',
                      border: 'none',
                      borderRadius: 12,
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.is_available ? 'var(--success)' : 'var(--danger)' }} />
                    {item.is_available ? 'In Stock' : 'Sold Out'}
                  </button>
                </div>

                <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-3)', padding: '0.15rem 0.5rem', borderRadius: 6, marginBottom: '0.5rem' }}>
                  {item.category}
                </div>

                {item.description && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--primary)' }}>
                  {formatCurrency(item.price)}
                </div>

                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button
                    onClick={() => handleOpenModal(item)}
                    className="btn btn-secondary btn-icon btn-sm"
                    title="Edit Item"
                    style={{ padding: '0.35rem' }}
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={e => handleDeleteItem(item.id, e)}
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Delete Item"
                    style={{ color: 'var(--danger)', padding: '0.35rem' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Menu Item Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '1.25rem' }}>
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="menu-name">Dish / Beverage Name</label>
                <input
                  id="menu-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Beef Luwombo, Chips & Chicken, Passion Juice"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="menu-cat">Category</label>
                  <select
                    id="menu-cat"
                    className="input"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    {MENU_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="menu-price">Price (UGX)</label>
                  <input
                    id="menu-price"
                    type="number"
                    inputMode="numeric"
                    className="input"
                    placeholder="e.g. 15000"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="menu-desc">Description / Ingredients (optional)</label>
                <textarea
                  id="menu-desc"
                  className="input"
                  placeholder="e.g. Served with fresh salad, steamed matooke, and peanut sauce"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Available to Order</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customers & waitstaff can select this item</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvailable(!isAvailable)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: isAvailable ? 'var(--primary)' : 'var(--text-muted)' }}
                >
                  {isAvailable ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Saving…' : editingItem ? 'Update Item' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preset Confirmation Modal */}
      {showPresetConfirm && (
        <div className="modal-backdrop" onClick={() => setShowPresetConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '0.75rem' }}>⚡ Load Restaurant Starter Menu</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              This will add 11 common restaurant dishes and beverages (Luwombo, Katogo, Rolex, Chips & Chicken, Pilau, Fresh Juice, Sodas) to your menu. You can edit or delete them anytime.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowPresetConfirm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={handleLoadStarterMenu}
                disabled={loading}
              >
                {loading ? 'Loading…' : '✅ Add Starter Menu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
