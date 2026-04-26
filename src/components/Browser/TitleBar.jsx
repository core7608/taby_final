// TitleBar.jsx — Custom window title bar for Electron (Win/Mac/Linux)
import { useState, useEffect } from 'react'
import { useBrowserStore } from '../../stores/browserStore'
import { Minus, Square, X, Maximize2 } from 'lucide-react'

const ipc = () => window.taby

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false)
  const isWin  = navigator.userAgent.includes('Windows')
  const isMac  = navigator.userAgent.includes('Macintosh')

  useEffect(() => {
    ipc()?.winIsMaximized().then(v => setMaximized(v)).catch(() => {})
  }, [])

  if (isMac) return null  // macOS: hiddenInset gives native traffic lights

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 32,
        background: 'var(--surface-3)',
        borderBottom: '1px solid var(--border)',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
      }}
    >
      {/* App icon + name */}
      <div className="flex items-center gap-2 px-3" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2a8bff,#0d6bff)' }}>
          <span className="text-white font-black" style={{ fontSize: 9 }}>T</span>
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Taby</span>
      </div>

      <div className="flex-1" />

      {/* Window controls — Windows style */}
      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' }}>
        <WinBtn onClick={() => ipc()?.winMinimize()} title="Minimize" hoverColor="#555">
          <Minus size={12} />
        </WinBtn>
        <WinBtn onClick={() => { ipc()?.winMaximize(); setMaximized(m => !m) }} title={maximized ? 'Restore' : 'Maximize'} hoverColor="#555">
          {maximized ? <Square size={10} /> : <Maximize2 size={10} />}
        </WinBtn>
        <WinBtn onClick={() => ipc()?.winClose()} title="Close" hoverColor="#e81123" danger>
          <X size={12} />
        </WinBtn>
      </div>
    </div>
  )
}

function WinBtn({ children, onClick, title, hoverColor = '#555', danger }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 46, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? hoverColor : 'transparent',
        border: 'none', cursor: 'pointer',
        color: hover && danger ? 'white' : 'var(--text-secondary)',
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      {children}
    </button>
  )
}
