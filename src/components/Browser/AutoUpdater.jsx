import { useState, useEffect } from 'react'

export default function AutoUpdater() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!window.taby) return
    const off = window.taby.on('update-ready', () => setReady(true))
    return off
  }, [])

  if (!ready) return null

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: 'var(--shadow-lg)',
    }}>
      <span style={{ fontSize: 20 }}>🔄</span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Update ready</p>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Restart to apply</p>
      </div>
      <button
        onClick={() => window.taby?.installUpdate?.()}
        style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
      >
        Restart
      </button>
      <button onClick={() => setReady(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}>✕</button>
    </div>
  )
}
