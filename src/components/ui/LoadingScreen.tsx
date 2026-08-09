export function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1rem', background: 'var(--surface-3)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'linear-gradient(135deg, #0066FF, #0040CC)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: 800, fontSize: '1.375rem',
        boxShadow: '0 8px 24px rgba(0,102,255,0.35)',
        animation: 'pulse 2s infinite',
      }}>Z</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading Zentra…</div>
    </div>
  )
}

export default LoadingScreen
