import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, Phone, User, ChevronRight } from 'lucide-react'
import { db, buildSyncMeta } from '@/database/dexie'
import { useBusinessStore } from '@/stores/businessStore'
import { formatCurrency } from '@/utils/currency'
import { generateId } from '@/utils/deviceId'
import type { Customer } from '@/types'

export default function CustomersListPage() {
  const { activeBusiness } = useBusinessStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const customers = useLiveQuery(async () => {
    if (!activeBusiness) return []
    return db.customers
      .where('business_id').equals(activeBusiness.id)
      .filter(c => !c.deleted_at)
      .reverse()
      .toArray()
  }, [activeBusiness?.id])

  const filtered = (customers ?? []).filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)
  })

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusiness || !name.trim()) return
    setLoading(true)

    const now = Date.now()
    const customer: Customer = {
      id: generateId(),
      business_id: activeBusiness.id,
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      credit_balance: 0,
      total_purchases: 0,
      created_at: now,
      updated_at: now,
      ...buildSyncMeta(),
    }

    await db.customers.add(customer)
    setName('')
    setPhone('')
    setAddress('')
    setShowModal(false)
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
        <div>
          <h2>Customers</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Manage customer debts and history</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
          <Plus size={16} /> New Customer
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="search" className="input" placeholder="Search customer by name or phone…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.75rem' }} />
      </div>

      {/* List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '5rem' }}>
        {!filtered.length ? (
          <div className="empty-state">
            <span className="empty-icon">👥</span>
            <p className="empty-title">No customers added yet</p>
            <p className="empty-desc">Creating customer records is optional. You can sell to quick walk-in buyers anytime.</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
              <Plus size={16} /> Add First Customer
            </button>
          </div>
        ) : (
          filtered.map((c, i) => (
            <Link key={c.id} to={`/customers/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {c.name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{c.name}</div>
                  {c.phone && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={12} /> {c.phone}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {c.credit_balance > 0 ? (
                    <div>
                      <span className="badge badge-warning">Owes</span>
                      <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.875rem' }}>{formatCurrency(c.credit_balance)}</div>
                    </div>
                  ) : (
                    <span className="badge badge-success">Clear</span>
                  )}
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '1rem' }}>Add Customer</h3>
            <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="cust-name">Customer Name</label>
                <input id="cust-name" type="text" className="input" placeholder="e.g. John Musoke" value={name} onChange={e => setName(e.target.value)} required autoFocus />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="cust-phone">Phone Number <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input id="cust-phone" type="tel" className="input" placeholder="e.g. 0770000000" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="cust-addr">Address / Location <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input id="cust-addr" type="text" className="input" placeholder="e.g. Plot 12 Market St" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Saving…' : 'Save Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
