import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Receipt, BookOpen,
  Users, BarChart3, Settings, Building2, Bike, Wallet, DollarSign,
  LogOut, ChevronDown, Package, UtensilsCrossed, ClipboardList, Stethoscope, Pill,
} from 'lucide-react'
import { useBusinessStore } from '@/stores/businessStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase, isSupabaseConfigured } from '@/services/supabase/client'
import { SyncIndicator } from './MobileNav'
import type { BusinessCategory } from '@/types/business'

const BASE_NAV = [
  { to: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/sales',     label: 'Sales',         icon: ShoppingCart },
  { to: '/products',  label: 'Stock & Items', icon: Package },
  { to: '/expenses',  label: 'Expenses',      icon: Receipt },
  { to: '/cashbook',  label: 'Cashbook',      icon: BookOpen },
  { to: '/customers', label: 'Customers',     icon: Users },
  { to: '/reports',   label: 'Reports',       icon: BarChart3 },
]

const MODULE_NAV: Record<string, { to: string; label: string; icon: React.ElementType }[]> = {
  restaurant: [
    { to: '/restaurant/menu',   label: 'Menu Setup', icon: UtensilsCrossed },
    { to: '/restaurant/orders', label: 'Orders',     icon: ClipboardList },
  ],
  clinic: [
    { to: '/clinic/patients',   label: 'Patients',   icon: Stethoscope },
    { to: '/clinic/dispensary', label: 'Dispensary', icon: Pill },
  ],
  boda_boda:    [{ to: '/transport',    label: 'Trips',      icon: Bike }],
  taxi:         [{ to: '/transport',    label: 'Trips',      icon: Bike }],
  mobile_money: [{ to: '/mobile-money', label: 'Agent Book', icon: Wallet }],
  bank_agent:   [{ to: '/mobile-money', label: 'Agent Book', icon: Wallet }],
  hustler:      [{ to: '/hustler',      label: 'My Income',  icon: DollarSign }],
}

export function DesktopSidebar() {
  const { activeBusiness, businesses, setActiveBusiness } = useBusinessStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const categoryModules = activeBusiness
    ? (MODULE_NAV[activeBusiness.category as BusinessCategory] ?? [])
    : []

  async function handleSignOut() {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    useAuthStore.getState().signOut()
    navigate('/auth/login')
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '0 0.875rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #0066FF, #0040CC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: '1rem',
          }}>Z</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-0.01em' }}>Zentra</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Business Manager</div>
          </div>
        </div>
      </div>

      {/* Business switcher */}
      {activeBusiness && (
        <button
          onClick={() => navigate('/businesses')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.75rem 0.875rem', marginTop: '0.75rem',
            background: 'var(--primary-light)', borderRadius: '10px',
            border: '1.5px solid var(--primary)', cursor: 'pointer',
            width: '100%', textAlign: 'left',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--primary)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', fontWeight: 700, flexShrink: 0,
          }}>{activeBusiness.name[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeBusiness.name}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {activeBusiness.category.replace('_', ' ')}
            </div>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        </button>
      )}

      {/* Main nav */}
      <div style={{ marginTop: '1rem', flex: 1 }}>
        <div className="sidebar-section-label">Main</div>
        {BASE_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}

        {categoryModules.length > 0 && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>Modules</div>
            {categoryModules.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} strokeWidth={2} />
                {label}
              </NavLink>
            ))}
          </>
        )}

        <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>Account</div>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <Settings size={18} strokeWidth={2} />
          Settings
        </NavLink>
        <NavLink to="/businesses" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <Building2 size={18} strokeWidth={2} />
          Businesses
        </NavLink>
      </div>

      {/* Bottom: sync + user */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ padding: '0 0.875rem' }}>
          <SyncIndicator />
        </div>
        {user && (
          <button className="sidebar-item" onClick={handleSignOut} style={{ color: 'var(--danger)' }}>
            <LogOut size={18} strokeWidth={2} />
            Sign Out
          </button>
        )}
      </div>
    </aside>
  )
}
