import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, MapPin, ChevronLeft } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useAuthStore } from '@/stores/authStore'
import { useBusinessStore } from '@/stores/businessStore'
import { generateId } from '@/utils/deviceId'
import { BUSINESS_CATEGORIES, type BusinessCategory, type Business } from '@/types/business'
import SubscriptionModal from '@/components/subscription/SubscriptionModal'

const STEPS = ['Category', 'Name', 'Location', 'Employees']

export default function BusinessSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { addBusiness, setActiveBusiness } = useBusinessStore()

  const category = (location.state as { category?: BusinessCategory })?.category ?? 'general'
  const catConfig = BUSINESS_CATEGORIES.find(c => c.id === category)

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [businessLocation, setBusinessLocation] = useState('')
  const [hasEmployees, setHasEmployees] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSubscription, setShowSubscription] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)

    const now = Date.now()
    const business: Business = {
      id: generateId(),
      owner_id: user?.id ?? 'demo',
      name: name.trim(),
      category,
      currency: 'UGX',
      location: businessLocation.trim() || undefined,
      has_employees: hasEmployees ?? false,
      subscription_status: 'trial',
      settings: {
        currency: 'UGX',
        currency_symbol: 'UGX',
        currency_position: 'before',
        low_stock_threshold: 5,
        tax_rate: 0,
        theme: 'light',
      },
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }

    await db.businesses.add(business)
    addBusiness(business)
    setActiveBusiness(business)
    setLoading(false)
    // Show subscription modal immediately after business creation
    setShowSubscription(true)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-3)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0052CC, #0066FF)', padding: '2.5rem 1.5rem 2rem' }}>
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/onboarding')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '0.5rem', color: 'white', cursor: 'pointer', display: 'flex', marginBottom: '1.25rem' }}
        ><ChevronLeft size={20} /></button>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ height: 4, flex: 1, borderRadius: 99, background: i <= step ? 'white' : 'rgba(255,255,255,0.3)', transition: 'background 0.3s' }} />
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: '1rem' }}>
          Step {step + 1} of {STEPS.length}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }}>{catConfig?.emoji}</span>
          <div>
            <h1 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
              {step === 1 && "What's your business name?"}
              {step === 2 && 'Where is your business?'}
              {step === 3 && 'Do you have employees?'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem' }}>{catConfig?.name}</p>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div style={{ flex: 1, padding: '1.5rem 1.25rem' }}>
        {step === 1 && (
          <div className="card fade-in">
            <div className="input-group">
              <label className="input-label" htmlFor="biz-name">Business name</label>
              <input
                id="biz-name" type="text" className="input"
                placeholder={`e.g. ${catConfig?.emoji} ${category === 'hustler' ? 'My Income' : "Kampala " + catConfig?.name}`}
                value={name} onChange={e => setName(e.target.value)}
                autoFocus style={{ fontSize: '1.125rem', fontWeight: 600 }}
              />
              <span className="input-hint">This is what appears on receipts and reports.</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card fade-in">
            <div className="input-group">
              <label className="input-label" htmlFor="biz-location">
                <MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />
                Business location <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <input
                id="biz-location" type="text" className="input"
                placeholder="e.g. Kampala, Nakawa Market"
                value={businessLocation}
                onChange={e => setBusinessLocation(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              This helps us set up the right modules for you.
            </p>
            {[
              { value: false, emoji: '🧑', label: "No — it's just me", desc: 'Solo operator or owner-only' },
              { value: true,  emoji: '👥', label: 'Yes — I have staff',  desc: 'One or more employees' },
            ].map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setHasEmployees(opt.value)}
                className="card"
                style={{
                  textAlign: 'left', cursor: 'pointer', border: 'none', width: '100%',
                  borderColor: hasEmployees === opt.value ? 'var(--primary)' : 'var(--border)',
                  background: hasEmployees === opt.value ? 'var(--primary-light)' : 'var(--surface)',
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.125rem',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '1.75rem' }}>{opt.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, color: hasEmployees === opt.value ? 'var(--primary)' : 'var(--text-primary)' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 && !name.trim()}
            className="btn btn-primary btn-lg btn-full"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={loading || hasEmployees === null}
            className="btn btn-primary btn-lg btn-full"
          >
            {loading ? <Loader2 size={20} /> : `✅ Create ${name || 'Business'}`}
          </button>
        )}
        {step === 2 && (
          <button onClick={() => setStep(step + 1)} className="btn btn-ghost btn-full" style={{ marginTop: '0.5rem' }}>
            Skip
          </button>
        )}
      </div>

      {/* Subscription modal shown immediately after business creation */}
      {showSubscription && (
        <SubscriptionModal
          onClose={() => {
            setShowSubscription(false)
            navigate('/dashboard')
          }}
        />
      )}
    </div>
  )
}
