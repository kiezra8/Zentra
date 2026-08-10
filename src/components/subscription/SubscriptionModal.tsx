import { useState } from 'react'
import { Smartphone, CheckCircle, ShieldCheck, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { SUBSCRIPTION_TIERS, type SubscriptionTierConfig } from '@/types/business'

interface SubscriptionModalProps {
  onClose?: () => void
  isPaywall?: boolean
}

export default function SubscriptionModal({ onClose, isPaywall = false }: SubscriptionModalProps) {
  const { activeBusiness, setActiveBusiness } = useBusinessStore()
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierConfig>(SUBSCRIPTION_TIERS[0])
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusStep, setStatusStep] = useState<'select' | 'push' | 'success'>('select')
  const [errorMessage, setErrorMessage] = useState('')

  const merchantName = 'Zentra Systems'

  async function handlePay() {
    if (!phone || phone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit MTN or Airtel phone number')
      return
    }
    setErrorMessage('')
    setLoading(true)
    setStatusStep('push')

    // Simulate Mobile Money USSD Push Prompt
    setTimeout(async () => {
      if (!activeBusiness) return

      const now = Date.now()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      const expiresAt = now + thirtyDaysMs

      const updated = {
        ...activeBusiness,
        subscription_tier: selectedTier.id,
        subscription_status: 'active' as const,
        subscription_expires_at: expiresAt,
        updated_at: now,
        sync_status: 'pending' as const,
      }

      await db.businesses.update(activeBusiness.id, {
        subscription_tier: selectedTier.id,
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
        updated_at: now,
        sync_status: 'pending',
      })

      setActiveBusiness(updated)
      setLoading(false)
      setStatusStep('success')
    }, 2500)
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 300 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        {!isPaywall && <div className="modal-handle" />}

        {statusStep === 'select' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #0066FF, #0040CC)',
                color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.5rem',
              }}>
                <Sparkles size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem' }}>
                {isPaywall ? 'Subscription Required' : 'Activate Zentra Monthly Plan'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Instant Mobile Money authorization to <strong>{merchantName}</strong>
              </p>
            </div>

            {/* Tiers List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {SUBSCRIPTION_TIERS.map(tier => {
                const isSelected = selectedTier.id === tier.id
                return (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTier(tier)}
                    className="card"
                    style={{
                      cursor: 'pointer', padding: '1rem',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                      background: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div className="flex-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.75rem' }}>{tier.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                            {tier.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tier.description}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.125rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                        {formatCurrency(tier.priceUGX)}
                        <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Mobile Money Phone Input */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="sub-phone">
                  <Smartphone size={14} style={{ display: 'inline', marginRight: 4 }} />
                  MTN or Airtel Money Phone Number
                </label>
                <input
                  id="sub-phone"
                  type="tel" inputMode="numeric"
                  className="input"
                  placeholder="e.g. 0770000000 or 0700000000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ fontSize: '1.125rem', fontWeight: 600 }}
                />
              </div>

              {errorMessage && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={14} /> {errorMessage}
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
                Initiates Mobile Money PIN prompt for {selectedTier.name} ({formatCurrency(selectedTier.priceUGX)}).
              </div>
            </div>

            {/* CTA */}
            <button onClick={handlePay} className="btn btn-primary btn-lg btn-full" style={{ gap: '0.5rem' }}>
              📱 Pay {formatCurrency(selectedTier.priceUGX)} via MoMo
            </button>

            {!isPaywall && onClose && (
              <button onClick={onClose} className="btn btn-ghost btn-full" style={{ marginTop: '0.5rem' }}>
                Cancel
              </button>
            )}
          </div>
        )}

        {statusStep === 'push' && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1.25rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Authorize Payment on Phone</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 340, margin: '0 auto' }}>
              Check your phone (<strong>{phone}</strong>) and enter your Mobile Money PIN to approve payment of <strong>UGX {selectedTier.priceUGX.toLocaleString()}</strong> to <strong>{merchantName}</strong>.
            </p>
          </div>
        )}

        {statusStep === 'success' && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle size={56} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
            <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Payment Approved & Active!</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Your 30-day <strong>{selectedTier.name}</strong> subscription is active for {activeBusiness?.name}.
            </p>
            <button
              onClick={() => {
                setStatusStep('select')
                if (onClose) onClose()
              }}
              className="btn btn-primary btn-lg btn-full"
            >
              🎉 Continue Using Zentra
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
