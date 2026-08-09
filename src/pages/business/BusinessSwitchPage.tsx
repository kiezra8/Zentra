import { useNavigate } from 'react-router-dom'
import { Plus, Check, Sparkles } from 'lucide-react'
import { useBusinessStore } from '@/stores/businessStore'
import { loadDemoData } from '@/database/seed'
import { BUSINESS_CATEGORIES } from '@/types/business'

export default function BusinessSwitchPage() {
  const navigate = useNavigate()
  const { businesses, activeBusiness, setActiveBusiness, setBusinesses } = useBusinessStore()

  async function handleLoadDemo() {
    await loadDemoData()
    // Refresh businesses from stores
    window.location.reload()
  }

  return (
    <div className="page-container">
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>Your Businesses</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Switch between operating profiles</p>
        </div>
        <button onClick={() => navigate('/onboarding')} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
          <Plus size={16} /> Add Business
        </button>
      </div>

      {/* Business list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {businesses.map((biz) => {
          const isSelected = activeBusiness?.id === biz.id
          const catConfig = BUSINESS_CATEGORIES.find(c => c.id === biz.category)
          return (
            <div
              key={biz.id}
              onClick={() => {
                setActiveBusiness(biz)
                navigate('/dashboard')
              }}
              className="card"
              style={{
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem',
                borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                background: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: isSelected ? 'var(--primary)' : 'var(--surface-3)',
                color: isSelected ? 'white' : 'var(--text-primary)',
                fontWeight: 800, fontSize: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {catConfig?.emoji ?? '🏢'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                  {biz.name}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {catConfig?.name} • {biz.location || 'Uganda'}
                </p>
              </div>

              {isSelected && (
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Seed Demo Data CTA */}
      <div className="card" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', textAlign: 'center', padding: '1.5rem' }}>
        <Sparkles size={28} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
        <h3 style={{ fontSize: '1rem', marginBottom: '0.375rem' }}>Testing Zentra?</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Instantly load 5 sample businesses (Retail, Restaurant, Mobile Money, Boda Boda, Hustler) with real transaction data.
        </p>
        <button onClick={handleLoadDemo} className="btn btn-secondary btn-full" style={{ gap: '0.5rem' }}>
          ✨ Load Demo Businesses & Data
        </button>
      </div>
    </div>
  )
}
