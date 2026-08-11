import { useState } from 'react'
import { Smartphone, CheckCircle, ShieldCheck, Sparkles, AlertCircle, PhoneCall } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { SUBSCRIPTION_TIERS, type SubscriptionTierConfig } from '@/types/business'

interface SubscriptionModalProps {
  onClose?: () => void
  isPaywall?: boolean
}

const PAYEE_NUMBER = '0702745945' // Airtel number

function detectNetwork(phone: string): 'mtn' | 'airtel' | null {
  const clean = phone.replace(/\D/g, '')
  const prefix = clean.startsWith('0') ? clean.slice(1, 4) : clean.slice(3, 6)
  const mtn = ['770','771','772','773','774','775','776','778','779','780','781','782','783','784','785','786','787','788','789','390','391','392','310','311','312','760','761','762']
  const airtel = ['700','701','702','703','704','705','706','707','708','709','750','751','752','753','754','755','756','757','758','759','740','741','742','730','731','732','733']
  if (mtn.some(p => prefix.startsWith(p.slice(0,2)))) return 'mtn'
  if (airtel.some(p => prefix.startsWith(p.slice(0,2)))) return 'airtel'
  return null
}

function buildUSSD(network: 'mtn' | 'airtel', amount: number): string {
  const recipient = PAYEE_NUMBER
  if (network === 'mtn') {
    // MTN Uganda Send Money: *165*2*RecipientNumber*Amount#
    return `*165*2*${recipient}*${amount}%23`
  } else {
    // Airtel Uganda Send Money: *185*9*RecipientNumber*Amount#
    return `*185*9*${recipient}*${amount}%23`
  }
}

export default function SubscriptionModal({ onClose, isPaywall = false }: SubscriptionModalProps) {
  const { activeBusiness, setActiveBusiness } = useBusinessStore()
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierConfig>(SUBSCRIPTION_TIERS[0])
  const [phone, setPhone] = useState('')
  const [statusStep, setStatusStep] = useState<'select' | 'dialing' | 'confirm' | 'success'>('select')
  const [errorMessage, setErrorMessage] = useState('')
  const [network, setNetwork] = useState<'mtn' | 'airtel' | null>(null)

  const merchantName = 'Zentra Systems'

  function handlePhoneChange(val: string) {
    setPhone(val)
    setErrorMessage('')
    const clean = val.replace(/\D/g, '')
    if (clean.length >= 10) {
      setNetwork(detectNetwork(clean))
    } else {
      setNetwork(null)
    }
  }

  function handleInitiateUSSD() {
    const clean = phone.replace(/\D/g, '')
    if (clean.length < 10) {
      setErrorMessage('Enter a valid 10-digit MTN or Airtel phone number')
      return
    }

    const detected = detectNetwork(clean) ?? 'mtn'
    const ussdCode = buildUSSD(detected, selectedTier.priceUGX)
    setStatusStep('dialing')

    // Open USSD dialer on Android — triggers real Mobile Money prompt
    setTimeout(() => {
      window.location.href = `tel:${ussdCode}`
    }, 400)

    // After 3s show the "I've paid" confirmation screen
    setTimeout(() => {
      setStatusStep('confirm')
    }, 3000)
  }

  async function handleConfirmPayment() {
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
    setStatusStep('success')
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 300 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        {!isPaywall && <div className="modal-handle" />}

        {/* ── STEP 1: Select tier + enter phone ── */}
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
                {isPaywall ? '🔒 Subscription Required' : 'Activate Zentra Monthly Plan'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Pay via Mobile Money to <strong>{merchantName}</strong>
              </p>
            </div>

            {/* Tiers */}
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

            {/* Phone input */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="sub-phone">
                  <Smartphone size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Your MTN or Airtel Money Number
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="sub-phone"
                    type="tel" inputMode="numeric"
                    className="input"
                    placeholder="e.g. 0771234567 or 0701234567"
                    value={phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    style={{ fontSize: '1.125rem', fontWeight: 600, paddingRight: '5rem' }}
                  />
                  {network && (
                    <span style={{
                      position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: network === 'mtn' ? '#FFC300' : '#FF0000',
                      color: network === 'mtn' ? '#000' : '#fff',
                      borderRadius: 6, padding: '0.2rem 0.5rem',
                      fontSize: '0.6875rem', fontWeight: 700,
                    }}>
                      {network === 'mtn' ? 'MTN' : 'AIRTEL'}
                    </span>
                  )}
                </div>
              </div>

              {errorMessage && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={14} /> {errorMessage}
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
                Opens Mobile Money dialer · Enter your PIN to pay {formatCurrency(selectedTier.priceUGX)}
              </div>
            </div>

            <button onClick={handleInitiateUSSD} className="btn btn-primary btn-lg btn-full" style={{ gap: '0.5rem' }}>
              <PhoneCall size={18} /> Open USSD Dialer · Pay {formatCurrency(selectedTier.priceUGX)}
            </button>

            {!isPaywall && onClose && (
              <button onClick={onClose} className="btn btn-ghost btn-full" style={{ marginTop: '0.5rem' }}>
                Cancel
              </button>
            )}
          </div>
        )}

        {/* ── STEP 2: Dialing ── */}
        {statusStep === 'dialing' && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📲</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Opening USSD Dialer…</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Your phone dialer is opening with the Mobile Money code.<br />
              Enter your <strong>Mobile Money PIN</strong> to pay <strong>{formatCurrency(selectedTier.priceUGX)}</strong> to <strong>{merchantName}</strong>.
            </p>
          </div>
        )}

        {/* ── STEP 3: Confirm payment ── */}
        {statusStep === 'confirm' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💳</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Did you authorize the payment?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              After entering your PIN in the USSD menu, tap below to activate your subscription.
            </p>

            <button onClick={handleConfirmPayment} className="btn btn-primary btn-lg btn-full" style={{ marginBottom: '0.75rem', gap: '0.5rem' }}>
              ✅ Yes, I've paid — Activate Subscription
            </button>
            <button
              onClick={() => setStatusStep('select')}
              className="btn btn-ghost btn-full"
              style={{ fontSize: '0.875rem' }}
            >
              ← Go back / Try again
            </button>
          </div>
        )}

        {/* ── STEP 4: Success ── */}
        {statusStep === 'success' && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle size={56} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
            <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Subscription Active! 🎉</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Your 30-day <strong>{selectedTier.name}</strong> plan is active for <strong>{activeBusiness?.name}</strong>.
            </p>
            <button
              onClick={() => { setStatusStep('select'); if (onClose) onClose() }}
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
