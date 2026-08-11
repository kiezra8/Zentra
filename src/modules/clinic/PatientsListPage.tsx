// Patients List Page
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Phone, ChevronRight } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { useAuthStore } from '@/stores/authStore'
import { generateId } from '@/utils/deviceId'
import type { Patient } from '@/types'

export default function PatientsListPage() {
  const { activeBusiness } = useBusinessStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', gender: '' as 'male'|'female'|'other'|'', dob: '', blood_group: '', allergies: '', address: '' })
  const [saving, setSaving] = useState(false)

  const patients = useLiveQuery(async () => {
    if (!activeBusiness) return []
    const all = await db.patients.where('business_id').equals(activeBusiness.id)
      .filter(p => !p.deleted_at).toArray()
    if (!search.trim()) return all.sort((a, b) => b.created_at - a.created_at)
    const q = search.toLowerCase()
    return all.filter(p => p.name.toLowerCase().includes(q) || p.phone?.includes(q))
  }, [activeBusiness?.id, search])

  async function handleSave() {
    if (!form.name.trim() || !activeBusiness) return
    setSaving(true)
    const now = Date.now()
    const patient: Patient = {
      id: generateId(),
      business_id: activeBusiness.id,
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      gender: form.gender || undefined,
      dob: form.dob ? new Date(form.dob).getTime() : undefined,
      blood_group: form.blood_group || undefined,
      allergies: form.allergies || undefined,
      address: form.address || undefined,
      created_at: now, updated_at: now,
      ...buildSyncMeta(),
    }
    await db.patients.add(patient)
    setSaving(false)
    setShowNew(false)
    setForm({ name:'',phone:'',gender:'',dob:'',blood_group:'',allergies:'',address:'' })
    navigate(`/clinic/patients/${patient.id}`)
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>👤 Patients</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{patients?.length ?? 0} registered</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
          <Plus size={16} /> Register
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" placeholder="Search by name or phone…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.5rem' }} />
      </div>

      {/* Patients list */}
      {!patients || patients.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem 1rem' }}>
          <span className="empty-icon">👤</span>
          <p className="empty-title">{search ? 'No patients found' : 'No patients yet'}</p>
          {!search && <button onClick={() => setShowNew(true)} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>Register First Patient</button>}
        </div>
      ) : patients.map(p => (
        <Link key={p.id} to={`/clinic/patients/${p.id}`} style={{ textDecoration: 'none' }}>
          <div className="card" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {p.name[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{p.name}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
                {p.phone && <span><Phone size={12} style={{ display: 'inline' }} /> {p.phone}</span>}
                {p.blood_group && <span>🩸 {p.blood_group}</span>}
                {p.gender && <span>{p.gender}</span>}
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </Link>
      ))}

      {/* Register patient modal */}
      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '1.25rem' }}>👤 Register New Patient</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input className="input" placeholder="Patient name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} autoFocus />
              </div>
              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <input className="input" type="tel" placeholder="07XXXXXXXX" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label">Gender</label>
                  <select className="input" value={form.gender} onChange={e => setForm(f => ({...f, gender: e.target.value as 'male'|'female'|'other'|''}))}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Blood Group</label>
                  <select className="input" value={form.blood_group} onChange={e => setForm(f => ({...f, blood_group: e.target.value}))}>
                    <option value="">Unknown</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Date of Birth</label>
                <input className="input" type="date" value={form.dob} onChange={e => setForm(f => ({...f, dob: e.target.value}))} />
              </div>
              <div className="input-group">
                <label className="input-label">Allergies / Medical History</label>
                <input className="input" placeholder="e.g. Penicillin allergy, Diabetic" value={form.allergies} onChange={e => setForm(f => ({...f, allergies: e.target.value}))} />
              </div>
              <div className="input-group">
                <label className="input-label">Address</label>
                <input className="input" placeholder="Village, Town" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowNew(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleSave} disabled={!form.name.trim() || saving} className="btn btn-primary" style={{ flex: 2 }}>
                {saving ? 'Saving…' : 'Register Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
