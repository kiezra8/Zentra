import { useNavigate } from 'react-router-dom'
import { Building2, RefreshCw, LogOut, Database } from 'lucide-react'
import { useBusinessStore } from '@/stores/businessStore'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { runSync } from '@/services/sync/syncEngine'
import { supabase, isSupabaseConfigured } from '@/services/supabase/client'
import { BUSINESS_CATEGORIES } from '@/types/business'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { activeBusiness } = useBusinessStore()
  const { user } = useAuthStore()
  const { status, lastSyncAt } = useSyncStore()

  const catConfig = BUSINESS_CATEGORIES.find(c => c.id === activeBusiness?.category)

  async function handleManualSync() {
    if (activeBusiness) {
      await runSync(activeBusiness.id)
    }
  }

  async function handleSignOut() {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    useAuthStore.getState().signOut()
    navigate('/auth/login')
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <h2>Settings & Account</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Manage business and sync preferences</p>
      </div>

      {/* Active Business Info */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {activeBusiness?.name[0]?.toUpperCase() ?? 'Z'}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.0625rem' }}>{activeBusiness?.name}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{catConfig?.emoji} {catConfig?.name}</p>
        </div>
        <button onClick={() => navigate('/businesses')} className="btn btn-secondary btn-sm">Switch</button>
      </div>

      {/* Sync Status Card */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <Database size={18} style={{ color: 'var(--primary)' }} /> Offline-First Database Sync
          </div>
          <span className={`badge badge-${status === 'synced' ? 'success' : status === 'syncing' ? 'warning' : 'muted'}`}>
            {status}
          </span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          All data is saved locally on your device. Cloud backup runs automatically in the background.
        </p>
        <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'Not synced yet'}
          </span>
          <button onClick={handleManualSync} className="btn btn-secondary btn-sm" style={{ gap: 4 }}>
            <RefreshCw size={14} /> Sync Now
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <h3 style={{ fontSize: '1rem' }}>Account & Security</h3>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Logged in as: <strong>{user?.email ?? 'Demo User'}</strong>
        </div>
      </div>

      {/* Sign Out */}
      <button onClick={handleSignOut} className="btn btn-danger btn-lg btn-full" style={{ marginBottom: '5rem', gap: '0.5rem' }}>
        <LogOut size={18} /> Sign Out of Zentra
      </button>
    </div>
  )
}
