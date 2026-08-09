import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { BUSINESS_CATEGORIES, type BusinessCategory } from '@/types/business'

export default function CategorySelectPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<BusinessCategory | null>(null)
  const [search, setSearch] = useState('')

  const filtered = BUSINESS_CATEGORIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  )

  function handleContinue() {
    if (!selected) return
    navigate('/onboarding/setup', { state: { category: selected } })
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-3)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0052CC 0%, #0066FF 100%)',
        padding: '2.5rem 1.5rem 2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.25rem', border: '1.5px solid rgba(255,255,255,0.3)' }}>Z</div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '1.125rem' }}>Zentra</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height: 4, flex: 1, borderRadius: 99, background: i === 0 ? 'white' : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: '1rem' }}>Step 1 of 4</p>

        <h1 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.375rem' }}>
          What type of business?
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem' }}>
          Choose your category for a tailored experience
        </p>
      </div>

      {/* Search */}
      <div style={{ padding: '1rem 1.25rem 0.5rem', background: 'var(--surface-3)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="search" className="input" placeholder="Search business type…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>
      </div>

      {/* Category grid */}
      <div style={{
        flex: 1, padding: '0.75rem 1.25rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.75rem',
        paddingBottom: '7rem',
        overflowY: 'auto',
      }}>
        {filtered.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelected(cat.id)}
            className={`category-card ${selected === cat.id ? 'selected' : ''}`}
            style={{
              borderColor: selected === cat.id ? cat.color : undefined,
              background: selected === cat.id ? `${cat.color}15` : undefined,
            }}
          >
            <span className="cat-emoji">{cat.emoji}</span>
            <span className="cat-name">{cat.name}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {cat.description}
            </span>
          </button>
        ))}
      </div>

      {/* Sticky CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        padding: '1rem 1.25rem', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}>
        <button
          onClick={handleContinue}
          disabled={!selected}
          className="btn btn-primary btn-lg btn-full"
        >
          Continue {selected ? `with ${BUSINESS_CATEGORIES.find(c => c.id === selected)?.emoji}` : ''}
        </button>
      </div>
    </div>
  )
}
