import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, ArrowLeftRight, BarChart3, MoreHorizontal, Plus,
  Package, BookOpen, Users, Receipt, Building2, Sparkles, X, Settings,
  UtensilsCrossed, ClipboardList, Stethoscope, Pill, Bike, Wallet, DollarSign
} from 'lucide-react'
import { useSyncStore } from '@/stores/syncStore'
import { useBusinessStore } from '@/stores/businessStore'

const SYNC_CONFIG = {
  synced:  { dot: 'synced',  label: 'Synced',    color: 'var(--success)' },
  syncing: { dot: 'syncing', label: 'Syncing…',  color: 'var(--warning)' },
  offline: { dot: 'offline', label: 'Offline',   color: 'var(--text-muted)' },
  failed:  { dot: 'failed',  label: 'Sync error',color: 'var(--danger)' },
}

export function SyncIndicator() {
  const { status } = useSyncStore()
  const cfg = SYNC_CONFIG[status]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span className={`sync-dot ${cfg.dot}`} />
      <span style={{ fontSize: '0.75rem', color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
    </div>
  )
}

export function MobileTopBar() {
  const { activeBusiness } = useBusinessStore()
  const navigate = useNavigate()

  return (
    <div className="top-bar">
      <button
        onClick={() => navigate('/businesses')}
        style={{
          background: 'var(--primary)',
          color: 'white',
          width: 32, height: 32,
          borderRadius: 8,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.875rem', fontWeight: 700, flexShrink: 0,
        }}
      >
        {activeBusiness?.name?.[0]?.toUpperCase() ?? 'Z'}
      </button>
      <div className="top-bar-title">{activeBusiness?.name ?? 'Zentra'}</div>
      <SyncIndicator />
    </div>
  )
}

export function MobileBottomNav() {
  const [showMoreDrawer, setShowMoreDrawer] = useState(false)
  const { activeBusiness } = useBusinessStore()
  const navigate = useNavigate()

  const isRestaurant = activeBusiness?.category === 'restaurant'
  const isClinic = activeBusiness?.category === 'clinic'

  const moreMenuItems = [
    ...(isRestaurant ? [
      { to: '/restaurant/menu',   label: 'Menu Setup', icon: UtensilsCrossed, color: '#DC2626' },
      { to: '/restaurant/orders', label: 'Orders',     icon: ClipboardList,   color: '#DC2626' },
    ] : []),
    ...(isClinic ? [
      { to: '/clinic/patients',   label: 'Patients',   icon: Stethoscope, color: '#10B981' },
      { to: '/clinic/dispensary', label: 'Dispensary', icon: Pill,        color: '#10B981' },
    ] : []),
    { to: '/products',  label: 'Stock & Items', icon: Package, color: 'var(--primary)' },
    { to: '/cashbook',  label: 'Cashbook',      icon: BookOpen, color: '#059669' },
    { to: '/customers', label: 'Customers',     icon: Users,    color: '#7C3AED' },
    { to: '/expenses',  label: 'Expenses',      icon: Receipt,  color: '#DC2626' },
    { to: '/reports',   label: 'Reports',       icon: BarChart3, color: '#D97706' },
    { to: '/businesses',label: 'Businesses',    icon: Building2, color: '#4B5563' },
    { to: '/settings',  label: 'Settings',      icon: Settings, color: '#0066FF' },
  ]

  return (
    <>
      <nav className="bottom-nav" style={{ display: 'flex' }}>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={20} strokeWidth={2} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ArrowLeftRight size={20} strokeWidth={2} />
          <span>Sales</span>
        </NavLink>

        <NavLink to="/sales/add" className="nav-fab" aria-label="Add transaction">
          <Plus size={24} strokeWidth={2.5} />
        </NavLink>

        <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Package size={20} strokeWidth={2} />
          <span>Stock</span>
        </NavLink>

        <button
          onClick={() => setShowMoreDrawer(true)}
          className={`nav-item ${showMoreDrawer ? 'active' : ''}`}
        >
          <MoreHorizontal size={20} strokeWidth={2} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" Drawer Slide-Up */}
      {showMoreDrawer && (
        <div className="modal-backdrop" onClick={() => setShowMoreDrawer(false)} style={{ zIndex: 200 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ borderRadius: '24px 24px 0 0' }}>
            <div className="modal-handle" />
            <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem' }}>All Modules & Shortcuts</h3>
              <button onClick={() => setShowMoreDrawer(false)} className="btn btn-ghost btn-sm btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {moreMenuItems.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      setShowMoreDrawer(false)
                      navigate(item.to)
                    }}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 14, padding: '1rem 0.5rem',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                      cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${item.color}15`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
