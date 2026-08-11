import { useState } from 'react'
import { Smartphone, CheckCircle, ShieldCheck, Sparkles, AlertCircle, Loader2, XCircle, Lock } from 'lucide-react'
import { db } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { SUBSCRIPTION_TIERS, type SubscriptionTierConfig } from '@/types/business'

interface SubscriptionModalProps {
  onClose?: () => void
  isPaywall?: boolean
}

const PAYEE_NUMBER = '0702745945'

function detectNetwork(phone: string): 'mtn' | 'airtel' | null {
  const clean = phone.replace(/\D/g, '')
  const prefix = clean.startsWith('0') ? clean.slice(1, 4) : clean.slice(3, 6)
  const mtn = ['770','771','772','773','774','775','776','778','779','780','781','782','783','784','785','786','787','788','789','390','391','392','310','311','312','760','761','762']
  const airtel = ['700','701','702','703','704','705','706','707','708','709','750','751','752','753','754','755','756','757','758','759','740','741','742','730','731','732','733']
  if (mtn.some(p => prefix.startsWith(p.slice(0,2)))) return 'mtn'
  if (airtel.some(p => prefix.startsWith(p.slice(0,2)))) return 'airtel'
  return null
}

export default function SubscriptionModal({ onClose, isPaywall = false }: SubscriptionModalProps) {
  const { activeBusiness, setActiveBusiness } = useBusinessStore()
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierConfig>(SUBSCRIPTION_TIERS[0])
  const [phone, setPhone] = useState('')
  const [statusStep, setStatusStep] = useState<'select' | 'stk_prompt' | 'processing' | 'cancelled' | 'success'>('select')
  const [errorMessage, setErrorMessage] = useState('')
  const [network, setNetwork] = useState<'mtn' | 'airtel' | null>(null)
  
  // STK Push Simulation state
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [procStage, setProcStage] = useState('')
  const [txRef, setTxRef] = useState('')

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

  function handleInitiatePayment() {
    const clean = phone.replace(/\D/g, '')
    if (clean.length < 10) {
      setErrorMessage('Enter a valid 10-digit MTN or Airtel phone number')
      return
    }

    const detected = detectNetwork(clean) ?? 'mtn'
    setNetwork(detected)
    setPin('')
    setPinError('')
    // Launch simulated Mobile Money STK Push PIN prompt
    setStatusStep('stk_prompt')
  }

  function handleCancelStk() {
    setStatusStep('cancelled')
  }

  async function handleAuthorizeStk(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) {
      setPinError('Enter your 4-digit Mobile Money PIN')
      return
    }
    setPinError('')
    setStatusStep('processing')

    // Simulate real gateway verification workflow
    setProcStage(`Connecting to ${network === 'mtn' ? 'MTN MoMo API' : 'Airtel Money API'}…`)
    await new Promise(r => setTimeout(r, 1200))

    setProcStage('Authorizing payment with PIN & checking balance…')
    await new Promise(r => setTimeout(r, 1500))

    const generatedRef = `${(network ?? 'momo').toUpperCase()}-${Math.floor(10000000 + Math.random() * 90000000)}`
    setTxRef(generatedRef)

    setProcStage('Payment confirmed! Activating 30-day subscription…')
    await new Promise(r => setTimeout(r, 1000))

    if (activeBusiness) {
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
    }

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
                Instant Mobile Money STK Push prompt to <strong>{merchantName}</strong>
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
                Triggers Mobile Money PIN prompt for {selectedTier.name} ({formatCurrency(selectedTier.priceUGX)}).
              </div>
            </div>

            <button onClick={handleInitiatePayment} className="btn btn-primary btn-lg btn-full" style={{ gap: '0.5rem' }}>
              📱 Initiate MoMo Payment · {formatCurrency(selectedTier.priceUGX)}
            </button>

            {!isPaywall && onClose && (
              <button onClick={onClose} className="btn btn-ghost btn-full" style={{ marginTop: '0.5rem' }}>
                Cancel
              </button>
            )}
          </div>
        )}

        {/* ── STEP 2: Simulated Official STK Push Prompt Overlay ── */}
        {statusStep === 'stk_prompt' && (
          <div style={{ padding: '0.5rem 0' }}>
            {/* Network Banner Header */}
            <div style={{
              background: network === 'mtn' ? '#FFC300' : '#DC2626',
              color: network === 'mtn' ? '#000' : '#FFF',
              borderRadius: 14, padding: '1rem', textAlign: 'center', marginBottom: '1.25rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
                {network === 'mtn' ? '📱 MTN Mobile Money' : '📲 Airtel Money'}
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>STK Push Prompt</div>
            </div>

            <form onSubmit={handleAuthorizeStk} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card" style={{ background: 'var(--surface-2)', textAlign: 'center', padding: '1.25rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Payment Request from <strong>{merchantName}</strong>
                </p>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                  {formatCurrency(selectedTier.priceUGX)}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Number: <strong>{phone}</strong> ({selectedTier.name})
                </p>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="momo-pin" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={14} /> Enter 4-Digit MoMo PIN to Authorize:
                </label>
                <input
                  id="momo-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="input"
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  style={{ fontSize: '1.5rem', letterSpacing: '0.5em', textAlign: 'center', fontWeight: 800 }}
                />
              </div>

              {pinError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8125rem', textAlign: 'center' }}>
                  ⚠️ {pinError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={handleCancelStk} className="btn btn-secondary" style={{ flex: 1 }}>
                  Reject / Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, background: network === 'mtn' ? '#E6B800' : '#B91C1C', color: network === 'mtn' ? '#000' : '#fff' }}>
                  ✅ Approve & Pay
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 3: Live Verification Processing ── */}
        {statusStep === 'processing' && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1.25rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Processing Payment…</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, minHeight: 40 }}>
              {procStage}
            </p>
          </div>
        )}

        {/* ── STEP 4: Cancelled / Rejected ── */}
        {statusStep === 'cancelled' && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <XCircle size={56} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
            <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Payment Rejected</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Transaction was cancelled or authorization failed. Subscription has NOT been activated.
            </p>
            <button
              onClick={() => setStatusStep('select')}
              className="btn btn-primary btn-full"
            >
              🔄 Try Again
            </button>
          </div>
        )}

        {/* ── STEP 5: Success & Receipt ── */}
        {statusStep === 'success' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <CheckCircle size={56} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
            <h2 style={{ color: 'var(--success)', marginBottom: '0.25rem' }}>Payment Successful! 🎉</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              TxRef: <strong>{txRef}</strong>
            </p>

            <div className="card" style={{ textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.875rem', background: 'var(--surface-2)' }}>
              <div className="flex-between" style={{ marginBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Business:</span>
                <strong>{activeBusiness?.name}</strong>
              </div>
              <div className="flex-between" style={{ marginBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Plan Tier:</span>
                <strong>{selectedTier.name}</strong>
              </div>
              <div className="flex-between" style={{ marginBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
                <strong>{formatCurrency(selectedTier.priceUGX)}</strong>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-muted)' }}>Valid Until:</span>
                <strong style={{ color: 'var(--success)' }}>30 Days Active</strong>
              </div>
            </div>

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
