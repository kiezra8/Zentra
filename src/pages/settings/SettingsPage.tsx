import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, RefreshCw, LogOut, Database, Sparkles, CheckCircle, CreditCard } from 'lucide-react'
import { useBusinessStore } from '@/stores/businessStore'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { runSync } from '@/services/sync/syncEngine'
import { supabase, isSupabaseConfigured } from '@/services/supabase/client'
import { BUSINESS_CATEGORIES, SUBSCRIPTION_TIERS } from '@/types/business'
import { formatDate } from '@/utils/date'
import SubscriptionModal from '@/components/subscription/SubscriptionModal'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { activeBusiness } = useBusinessStore()
  const { user } = useAuthStore()
  const { status, lastSyncAt } = useSyncStore()
  const [showSubModal, setShowSubModal] = useState(false)

  const catConfig = BUSINESS_CATEGORIES.find(c => c.id === activeBusiness?.category)
  const currentTierConfig = SUBSCRIPTION_TIERS.find(t => t.id === activeBusiness?.subscription_tier) ?? SUBSCRIPTION_TIERS[0]
  const isSubActive = activeBusiness?.subscription_status === 'active'

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
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Manage business and subscription plan</p>
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

      {/* Monthly Subscription & Mobile Money Card */}
      <div className="card" style={{ marginBottom: '1.25rem', border: '1px solid var(--primary)', background: 'linear-gradient(135deg, rgba(0,102,255,0.04), rgba(0,102,255,0.12))' }}>
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem' }}>
            <Sparkles size={20} style={{ color: 'var(--primary)' }} /> Monthly Plan
          </div>
          <span className={`badge ${isSubActive ? 'badge-success' : 'badge-warning'}`}>
            {isSubActive ? '🟢 Active' : '🟡 Trial / Renew'}
          </span>
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          <div>Current Tier: <strong>{currentTierConfig.name} ({currentTierConfig.priceUGX.toLocaleString()} UGX / mo)</strong></div>
          {activeBusiness?.subscription_expires_at && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Expires on: {formatDate(activeBusiness.subscription_expires_at)}
            </div>
          )}
        </div>

        <button onClick={() => setShowSubModal(true)} className="btn btn-primary btn-full" style={{ gap: '0.5rem' }}>
          <CreditCard size={18} /> Renew / Upgrade via Mobile Money
        </button>
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

      {/* Subscription Modal */}
      {showSubModal && (
        <SubscriptionModal onClose={() => setShowSubModal(false)} />
      )}
    </div>
  )
}
