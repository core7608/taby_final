import { useRef } from 'react'
import { useBrowserStore } from '../../stores/browserStore'
import { Plus, X, Globe, Lock } from 'lucide-react'

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--border)" strokeWidth="2" />
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function TabFavicon({ tab }) {
  if (tab.isLoading) return <Spinner />
  if (tab.favicon) return <img src={tab.favicon} alt="" width={16} height={16} style={{ borderRadius: 2 }} onError={e => { e.target.style.display = 'none' }} />
  if (tab.url?.startsWith('taby://')) return <span style={{ fontSize: 13 }}>🌐</span>
  return <Globe size={14} color="var(--text-tertiary)" strokeWidth={1.5} />
}

export default function TabBar() {
  const { tabs, activeTabId, addTab, setActiveTab, closeTab, isPrivateMode } = useBrowserStore()
  const scrollRef = useRef(null)
  const pinned = tabs.filter(t => t.isPinned)
  const normal = tabs.filter(t => !t.isPinned)

  return (
    <div className="chrome-tab-bar" style={{ WebkitAppRegion: 'drag', userSelect: 'none' }}>
      {isPrivateMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, marginRight: 4, marginBottom: 4, background: 'rgba(168,85,247,0.15)', color: '#9333ea', fontSize: 11, fontWeight: 700, flexShrink: 0, WebkitAppRegion: 'no-drag' }}>
          <Lock size={10} /> Private
        </div>
      )}
      {pinned.map(tab => (
        <TabItem key={tab.id} tab={tab} onActivate={setActiveTab} onClose={closeTab} isActive={tab.id === activeTabId} pinned />
      ))}
      {pinned.length > 0 && (
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px 4px', flexShrink: 0 }} />
      )}
      <div ref={scrollRef} style={{ display: 'flex', alignItems: 'flex-end', flex: 1, overflowX: 'auto', gap: 1, scrollbarWidth: 'none', WebkitAppRegion: 'no-drag' }}>
        {normal.map(tab => (
          <TabItem key={tab.id} tab={tab} onActivate={setActiveTab} onClose={closeTab} isActive={tab.id === activeTabId} />
        ))}
      </div>
      <button className="chrome-new-tab-btn" onClick={() => addTab()} title="New Tab (Ctrl+T)" style={{ marginBottom: 4, WebkitAppRegion: 'no-drag' }}>
        <Plus size={15} strokeWidth={2} />
      </button>
    </div>
  )
}

function TabItem({ tab, onActivate, onClose, isActive, pinned }) {
  let displayTitle = 'New Tab'
  if (tab.title && tab.title !== 'New Tab') displayTitle = tab.title
  else if (tab.url && !tab.url.startsWith('taby://')) {
    try { displayTitle = new URL(tab.url).hostname } catch { displayTitle = tab.url }
  } else if (tab.url === 'taby://newtab') displayTitle = 'New Tab'
  else if (tab.url?.startsWith('taby://')) displayTitle = tab.url.replace('taby://', '')

  return (
    <div
      className={`chrome-tab ${isActive ? 'active' : ''}`}
      onClick={() => onActivate(tab.id)}
      style={pinned ? { minWidth: 36, maxWidth: 36, justifyContent: 'center', padding: '0 8px', WebkitAppRegion: 'no-drag' } : { WebkitAppRegion: 'no-drag' }}
      title={tab.title || tab.url}
    >
      <div className="chrome-tab-favicon">
        <TabFavicon tab={tab} />
      </div>
      {!pinned && <span className="chrome-tab-title">{displayTitle}</span>}
      {!pinned && (
        <button className="chrome-tab-close" onClick={e => { e.stopPropagation(); onClose(tab.id) }} title="Close">
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
