import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ArrowLeftRight, BarChart3, MoreHorizontal, Plus } from 'lucide-react'
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
  return (
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

      <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <BarChart3 size={20} strokeWidth={2} />
        <span>Reports</span>
      </NavLink>

      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <MoreHorizontal size={20} strokeWidth={2} />
        <span>More</span>
      </NavLink>
    </nav>
  )
}
