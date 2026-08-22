// New Visit Page — Triage → Diagnosis → Prescriptions → Billing
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { generateId } from '@/utils/deviceId'
import { formatCurrency } from '@/utils/currency'
import type { PatientVisit, Prescription, PatientBill, Patient, Sale } from '@/types'

const STEPS = ['Patient', 'Triage', 'Diagnosis', 'Prescriptions', 'Billing']

interface RxEntry { name: string; dosage: string; frequency: string; duration: string; quantity: string }

export default function NewVisitPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { activeBusiness } = useBusinessStore()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 0 — patient selection
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  // Step 1 — triage
  const [complaint, setComplaint] = useState('')
  const [bp, setBp] = useState('')
  const [temp, setTemp] = useState('')
  const [weight, setWeight] = useState('')
  const [pulse, setPulse] = useState('')

  // Step 2 — diagnosis
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')

  // Step 3 — prescriptions
  const [rxList, setRxList] = useState<RxEntry[]>([{ name: '', dosage: '', frequency: '', duration: '', quantity: '1' }])

  // Step 4 — billing
  const [consultFee, setConsultFee] = useState('')
  const [medicineCost, setMedicineCost] = useState('')
  const [labCost, setLabCost] = useState('')
  const [otherCost, setOtherCost] = useState('')
  const [paidNow, setPaidNow] = useState('')

  useEffect(() => {
    const prePatientId = params.get('patient')
    if (prePatientId && activeBusiness) {
      db.patients.get(prePatientId).then(p => { if (p) { setSelectedPatient(p); setStep(1) } })
    }
    if (activeBusiness) {
      db.patients.where('business_id').equals(activeBusiness.id).filter(p => !p.deleted_at).toArray().then(setPatients)
    }
  }, [activeBusiness, params])

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.phone?.includes(patientSearch)
  )

  function addRx() { setRxList(l => [...l, { name:'',dosage:'',frequency:'',duration:'',quantity:'1' }]) }
  function removeRx(i: number) { setRxList(l => l.filter((_, idx) => idx !== i)) }
  function updateRx(i: number, field: keyof RxEntry, val: string) {
    setRxList(l => l.map((r, idx) => idx === i ? {...r, [field]: val} : r))
  }

  const totalBill = [consultFee, medicineCost, labCost, otherCost].reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const balance = Math.max(0, totalBill - (parseFloat(paidNow) || 0))

  async function handleFinish() {
    if (!activeBusiness || !selectedPatient) return
    setSaving(true)
    const now = Date.now()

    // Create visit
    const visit: PatientVisit = {
      id: generateId(), business_id: activeBusiness.id, patient_id: selectedPatient.id,
      visit_date: now, chief_complaint: complaint,
      triage_bp: bp || undefined, triage_temp: temp || undefined,
      triage_weight: weight || undefined, triage_pulse: pulse || undefined,
      diagnosis: diagnosis || undefined, doctor_notes: notes || undefined,
      status: 'closed',
      created_at: now, updated_at: now, ...buildSyncMeta(),
    }
    await db.patientVisits.add(visit)

    // Create prescriptions
    const validRx = rxList.filter(r => r.name.trim())
    for (const rx of validRx) {
      const prescription: Prescription = {
        id: generateId(), visit_id: visit.id, business_id: activeBusiness.id,
        medicine_name: rx.name.trim(), dosage: rx.dosage, frequency: rx.frequency,
        duration: rx.duration, quantity: parseInt(rx.quantity) || 1, dispensed: false,
        created_at: now, updated_at: now, ...buildSyncMeta(),
      }
      await db.prescriptions.add(prescription)
    }

    // Create bill
    if (totalBill > 0) {
      const bill: PatientBill = {
        id: generateId(), visit_id: visit.id, business_id: activeBusiness.id,
        patient_id: selectedPatient.id,
        consultation_fee: parseFloat(consultFee) || 0,
        medicine_cost: parseFloat(medicineCost) || 0,
        lab_cost: parseFloat(labCost) || 0,
        other_cost: parseFloat(otherCost) || 0,
        total: totalBill, paid: parseFloat(paidNow) || 0, balance,
        status: balance === 0 ? 'paid' : (parseFloat(paidNow) || 0) > 0 ? 'partial' : 'unpaid',
        created_at: now, updated_at: now, ...buildSyncMeta(),
      }
      await db.patientBills.add(bill)

      // Record payment as income (Sale) so it shows in Dashboard, Cashbook & Reports
      const amountPaid = parseFloat(paidNow) || 0
      if (amountPaid > 0) {
        const sale: Sale = {
          id: generateId(),
          business_id: activeBusiness.id,
          total: amountPaid,
          subtotal: amountPaid,
          discount: 0,
          tax: 0,
          payment_method: 'cash',
          notes: `Patient billing — ${selectedPatient.name}`,
          receipt_no: `CLN${now.toString().slice(-6)}`,
          created_at: now,
          updated_at: now,
          ...buildSyncMeta(),
        }
        await db.sales.add(sale)
      }
    }

    setSaving(false)
    navigate(`/clinic/patients/${selectedPatient.id}`)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-3)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #059669, #10B981)', padding: '2rem 1.5rem 1.5rem' }}>
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '0.5rem', color: 'white', cursor: 'pointer', display: 'flex', marginBottom: '1rem' }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem' }}>
          {STEPS.map((s, i) => <div key={i} style={{ height: 4, flex: 1, borderRadius: 99, background: i <= step ? 'white' : 'rgba(255,255,255,0.3)' }} />)}
        </div>
        <h1 style={{ color: 'white', fontSize: '1.375rem' }}>{STEPS[step]}</h1>
        {selectedPatient && <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>Patient: {selectedPatient.name}</p>}
      </div>

      <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto' }}>
        {/* Step 0: Select patient */}
        {step === 0 && (
          <div>
            <input className="input" placeholder="Search patient by name or phone…"
              value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
              style={{ marginBottom: '1rem' }} autoFocus />
            {filteredPatients.map(p => (
              <div key={p.id} onClick={() => { setSelectedPatient(p); setStep(1) }}
                className="card" style={{ cursor: 'pointer', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{p.phone ?? 'No phone'} · {p.blood_group ?? ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Triage */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="input-group">
              <label className="input-label">Chief Complaint *</label>
              <input className="input" placeholder="What brings the patient today?" value={complaint} onChange={e => setComplaint(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="input-group">
                <label className="input-label">Blood Pressure</label>
                <input className="input" placeholder="120/80" value={bp} onChange={e => setBp(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Temperature</label>
                <input className="input" placeholder="36.8°C" value={temp} onChange={e => setTemp(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Weight</label>
                <input className="input" placeholder="68 kg" value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Pulse</label>
                <input className="input" placeholder="72 bpm" value={pulse} onChange={e => setPulse(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Diagnosis */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="input-group">
              <label className="input-label">Diagnosis</label>
              <textarea className="input" rows={3} placeholder="Clinical diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} autoFocus />
            </div>
            <div className="input-group">
              <label className="input-label">Doctor Notes / Plan</label>
              <textarea className="input" rows={3} placeholder="Treatment plan, observations…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3: Prescriptions */}
        {step === 3 && (
          <div>
            {rxList.map((rx, i) => (
              <div key={i} className="card" style={{ marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>💊 Medicine {i + 1}</span>
                  {rxList.length > 1 && <button onClick={() => removeRx(i)} className="btn btn-ghost btn-icon btn-sm"><Trash2 size={16} /></button>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <input className="input" placeholder="Medicine name" value={rx.name} onChange={e => updateRx(i,'name',e.target.value)} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input className="input" placeholder="Dosage (e.g. 500mg)" value={rx.dosage} onChange={e => updateRx(i,'dosage',e.target.value)} />
                    <input className="input" placeholder="Frequency (3x daily)" value={rx.frequency} onChange={e => updateRx(i,'frequency',e.target.value)} />
                    <input className="input" placeholder="Duration (5 days)" value={rx.duration} onChange={e => updateRx(i,'duration',e.target.value)} />
                    <input className="input" type="number" placeholder="Qty" value={rx.quantity} onChange={e => updateRx(i,'quantity',e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addRx} className="btn btn-secondary btn-full" style={{ gap: '0.375rem' }}>
              <Plus size={16} /> Add Another Medicine
            </button>
          </div>
        )}

        {/* Step 4: Billing */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="input-group">
                <label className="input-label">Consultation Fee</label>
                <input className="input" type="number" placeholder="0" value={consultFee} onChange={e => setConsultFee(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Medicine Cost</label>
                <input className="input" type="number" placeholder="0" value={medicineCost} onChange={e => setMedicineCost(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Lab / Tests</label>
                <input className="input" type="number" placeholder="0" value={labCost} onChange={e => setLabCost(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Other Charges</label>
                <input className="input" type="number" placeholder="0" value={otherCost} onChange={e => setOtherCost(e.target.value)} />
              </div>
            </div>

            <div className="card" style={{ background: 'var(--surface-2)', borderRadius: 14 }}>
              <div className="flex-between" style={{ fontSize: '1rem', fontWeight: 800 }}>
                <span>Total Bill</span>
                <span style={{ color: 'var(--primary)' }}>{formatCurrency(totalBill)}</span>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Amount Paid Now (UGX)</label>
              <input className="input" type="number" placeholder="0" value={paidNow} onChange={e => setPaidNow(e.target.value)} style={{ fontSize: '1.25rem', fontWeight: 700 }} autoFocus />
            </div>

            {balance > 0 && (
              <div style={{ padding: '0.875rem', background: 'var(--danger-light)', borderRadius: 12, color: 'var(--danger)', fontWeight: 600 }}>
                💳 Outstanding Balance: {formatCurrency(balance)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '1rem 1.25rem', background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'max(1rem,env(safe-area-inset-bottom))' }}>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(step + 1)} disabled={step === 1 && !complaint.trim()}
            className="btn btn-primary btn-lg btn-full">
            Continue →
          </button>
        ) : (
          <button onClick={handleFinish} disabled={saving} className="btn btn-primary btn-lg btn-full">
            {saving ? 'Saving…' : '✅ Complete Visit & Save'}
          </button>
        )}
        {step === 2 || step === 3 ? (
          <button onClick={() => setStep(step + 1)} className="btn btn-ghost btn-full" style={{ marginTop: '0.5rem' }}>
            Skip this step
          </button>
        ) : null}
      </div>
    </div>
  )
}
