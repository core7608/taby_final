import { useState, useRef, useEffect, useCallback } from 'react'
import { useBrowserStore } from '../../stores/browserStore'
import {
  ChevronLeft, ChevronRight, RotateCw, X, Shield,
  Star, Code2, Wifi, WifiOff, Sun, Moon,
  Download, MoreHorizontal, Globe, Lock, LayoutGrid
} from 'lucide-react'
import OmniboxDropdown from './OmniboxDropdown'

const ipc = () => typeof window !== 'undefined' && window.taby

function prettyUrl(url) {
  if (!url || url.startsWith('taby://')) return ''
  try {
    const u = new URL(url)
    return u.hostname + (u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : '')
  } catch { return url }
}

export default function Toolbar() {
  const {
    tabs, activeTabId, getActiveTab,
    navigateTab, goBack, goForward, reload, stop,
    addBookmark, removeBookmark, isBookmarked,
    adBlockEnabled, toggleAdBlock,
    vpnEnabled, toggleVPN, theme, setTheme,
    urlBarFocused, setUrlBarFocused, setOmniboxQuery,
    toggleDevTools, toggleSidebar, addTab, settings,
  } = useBrowserStore()

  const activeTab   = getActiveTab()
  const [draft, setDraft]       = useState('')
  const [editing, setEditing]   = useState(false)
  const [showDrop, setShowDrop] = useState(false)
  const inputRef = useRef(null)

  // Sync draft ← activeTab.url عند تغيير التاب
  useEffect(() => {
    if (!editing) setDraft(activeTab?.url?.startsWith('taby://') ? '' : (activeTab?.url || ''))
  }, [activeTabId, activeTab?.url, editing])

  // ── Navigate ───────────────────────────────────────────────────────────────
  const navigate = useCallback((raw) => {
    let url = raw.trim()
    if (!url) return
    if (url.startsWith('taby://')) {
      useBrowserStore.getState().updateTab(activeTabId, { url })
      setShowDrop(false); setEditing(false); return
    }
    const engines = {
      google:     'https://www.google.com/search?q=',
      duckduckgo: 'https://duckduckgo.com/?q=',
      bing:       'https://www.bing.com/search?q=',
    }
    if (!url.includes('.') && !url.includes('://')) {
      url = (engines[settings.searchEngine] || engines.google) + encodeURIComponent(url)
    } else if (!url.startsWith('http')) {
      url = 'https://' + url
    }
    navigateTab(activeTabId, url)
    setDraft(url)
    setShowDrop(false); setEditing(false)
    inputRef.current?.blur()
  }, [activeTabId, settings.searchEngine])

  const onKey = (e) => {
    if (e.key === 'Enter')  navigate(draft)
    if (e.key === 'Escape') { setShowDrop(false); setEditing(false); inputRef.current?.blur() }
  }

  const isSecure = activeTab?.url?.startsWith('https://')
  const isTaby   = activeTab?.url?.startsWith('taby://')
  const starred  = activeTab ? isBookmarked(activeTab.url) : false

  return (
    <div className="chrome-toolbar">

      {/* ── Nav buttons ───────────────────────────────────────────────── */}
      <div className="chrome-nav-group">
        <button className={`chrome-nav-btn ${!activeTab?.canGoBack ? 'disabled' : ''}`}
          onClick={() => goBack(activeTabId)} disabled={!activeTab?.canGoBack} title="السابق">
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <button className={`chrome-nav-btn ${!activeTab?.canGoForward ? 'disabled' : ''}`}
          onClick={() => goForward(activeTabId)} disabled={!activeTab?.canGoForward} title="التالي">
          <ChevronRight size={18} strokeWidth={2} />
        </button>
        <button className="chrome-nav-btn"
          onClick={() => activeTab?.isLoading ? stop(activeTabId) : reload(activeTabId)}>
          {activeTab?.isLoading
            ? <X size={16} strokeWidth={2.5} />
            : <RotateCw size={15} strokeWidth={2} />
          }
        </button>
      </div>

      {/* ── Omnibox ───────────────────────────────────────────────────── */}
      <div className="chrome-omnibox-wrap">
        <div className={`chrome-omnibox ${editing ? 'editing' : ''}`}
          onClick={() => { setEditing(true); setShowDrop(true); setTimeout(() => inputRef.current?.select(), 10) }}>

          <div className="chrome-omnibox-icon">
            {isTaby
              ? <span className="taby-badge">T</span>
              : isSecure
                ? <Lock size={12} color="#1e8449" strokeWidth={2.5} />
                : <Globe size={12} color="var(--text-tertiary)" strokeWidth={2} />
            }
          </div>

          <input
            ref={inputRef}
            type="text"
            value={editing ? draft : (isTaby ? (activeTab?.title || '') : prettyUrl(activeTab?.url || ''))}
            onChange={e => { setDraft(e.target.value); setOmniboxQuery(e.target.value) }}
            onFocus={() => {
              setEditing(true); setShowDrop(true); setUrlBarFocused(true)
              setDraft(activeTab?.url?.startsWith('taby://') ? '' : activeTab?.url || '')
            }}
            onBlur={() => setTimeout(() => { setShowDrop(false); setEditing(false); setUrlBarFocused(false) }, 150)}
            onKeyDown={onKey}
            className="chrome-omnibox-input"
            placeholder="ابحث أو أدخل رابط"
            spellCheck={false}
            autoComplete="off"
          />

          {!isTaby && (
            <button className="chrome-omnibox-action" onClick={e => {
              e.stopPropagation()
              if (!activeTab) return
              starred
                ? removeBookmark(activeTab.url)
                : addBookmark({ url: activeTab.url, title: activeTab.title, favicon: activeTab.favicon, addedAt: Date.now() })
            }}>
              <Star size={14}
                fill={starred ? '#f59e0b' : 'none'}
                color={starred ? '#f59e0b' : 'var(--text-tertiary)'}
                strokeWidth={2} />
            </button>
          )}

          {adBlockEnabled && !isTaby && (
            <span className="chrome-adfree-badge">AD</span>
          )}
        </div>

        {showDrop && <OmniboxDropdown query={draft} onNavigate={navigate} />}
      </div>

      {/* ── Right actions ─────────────────────────────────────────────── */}
      <div className="chrome-actions">
        <button className="chrome-action-btn" title="التطبيقات"
          onClick={() => addTab('taby://apps')} style={{ color: 'var(--accent)' }}>
          <LayoutGrid size={16} />
        </button>
        <button className="chrome-action-btn" onClick={toggleDevTools} title="DevTools (F12)">
          <Code2 size={16} />
        </button>
        <button className="chrome-action-btn" onClick={toggleAdBlock}
          style={{ color: adBlockEnabled ? '#16a34a' : 'var(--text-tertiary)' }}
          title={adBlockEnabled ? 'حاجب الإعلانات: مفعّل' : 'معطّل'}>
          <Shield size={16} />
        </button>
        <button className="chrome-action-btn" onClick={toggleVPN}
          style={{ color: vpnEnabled ? 'var(--accent)' : 'var(--text-tertiary)' }}>
          {vpnEnabled ? <Wifi size={16} /> : <WifiOff size={16} />}
        </button>
        <button className="chrome-action-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="chrome-action-btn" onClick={() => toggleSidebar('downloads')}>
          <Download size={16} />
        </button>
        <button className="chrome-action-btn" onClick={() => toggleSidebar('settings')}>
          <MoreHorizontal size={17} />
        </button>
      </div>
    </div>
  )
}
