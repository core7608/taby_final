// src/stores/browserStore.js — Taby Browser (Electron)
// إدارة كل حالة المتصفح + IPC مع Electron

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let _counter = 1
const newId  = () => _counter++

const mkTab = (url = 'taby://newtab', title = 'New Tab') => ({
  id:          newId(),
  url,
  title,
  favicon:     null,
  isLoading:   false,
  canGoBack:   false,
  canGoForward:false,
  isPinned:    false,
  isMuted:     false,
  isHibernated:false,
  isStealth:   false,
  zoom:        100,
  createdAt:   Date.now(),
})

// Bridge to Electron IPC (null in browser dev)
const ipc = typeof window !== 'undefined' && window.taby ? window.taby : null

export const useBrowserStore = create(
  persist(
    (set, get) => ({

      // ── Tabs ───────────────────────────────────────────────────────────
      tabs:        [mkTab()],
      activeTabId: 1,

      addTab: (url = 'taby://newtab', options = {}) => {
        const tab = mkTab(url)
        if (options.pinned)  tab.isPinned  = true
        if (options.stealth) tab.isStealth = true
        set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }))

        // يخبر Electron ينشئ WebContentsView للتاب الجديد
        const needsView = url && !url.startsWith('taby://')
        if (needsView) {
          ipc?.tabCreate({ tabId: tab.id, url, isPrivate: tab.isStealth })
        }
        return tab.id
      },

      closeTab: (id) => {
        ipc?.tabClose({ tabId: id })
        const { tabs, activeTabId } = get()
        if (tabs.length === 1) {
          const t = mkTab()
          set({ tabs: [t], activeTabId: t.id })
          return
        }
        const idx     = tabs.findIndex(t => t.id === id)
        const newTabs = tabs.filter(t => t.id !== id)
        const newAct  = activeTabId === id
          ? newTabs[Math.min(idx, newTabs.length - 1)].id
          : activeTabId
        set({ tabs: newTabs, activeTabId: newAct })
        // مش الـ active — بس لو كان active نبعت activate للجديد
        if (activeTabId === id) ipc?.tabActivate({ tabId: newAct })
      },

      setActiveTab: (id) => {
        set({ activeTabId: id })
        const tab = get().tabs.find(t => t.id === id)
        if (tab && !tab.url.startsWith('taby://') && !tab.isHibernated) {
          ipc?.tabActivate({ tabId: id })
        }
      },

      updateTab: (id, updates) => {
        set(s => ({ tabs: s.tabs.map(t => t.id === id ? { ...t, ...updates } : t) }))
        // لو الـ URL اتغير → navigate
        if (updates.url && !updates.url.startsWith('taby://')) {
          const tab = get().tabs.find(t => t.id === id)
          if (!tab?.isHibernated) {
            ipc?.tabNavigate({ tabId: id, url: updates.url })
          }
        }
      },

      navigateTab: (id, url) => {
        set(s => ({ tabs: s.tabs.map(t => t.id === id ? { ...t, url, isLoading: true } : t) }))
        if (!url.startsWith('taby://')) {
          ipc?.tabNavigate({ tabId: id, url })
        }
      },

      goBack:    (id) => ipc?.tabBack({ tabId: id }),
      goForward: (id) => ipc?.tabForward({ tabId: id }),
      reload:    (id) => ipc?.tabReload({ tabId: id }),
      stop:      (id) => ipc?.tabStop({ tabId: id }),

      moveTab: (fromId, toId) => {
        const { tabs } = get()
        const from = tabs.findIndex(t => t.id === fromId)
        const to   = tabs.findIndex(t => t.id === toId)
        const arr  = [...tabs]
        const [mv] = arr.splice(from, 1)
        arr.splice(to, 0, mv)
        set({ tabs: arr })
      },

      duplicateTab: (id) => {
        const src = get().tabs.find(t => t.id === id)
        if (!src) return
        const t = { ...mkTab(src.url, src.title), favicon: src.favicon }
        set(s => ({ tabs: [...s.tabs, t], activeTabId: t.id }))
        if (!src.url.startsWith('taby://')) {
          ipc?.tabCreate({ tabId: t.id, url: src.url, isPrivate: t.isStealth })
        }
      },

      hibernateTab: (id) => {
        ipc?.tabClose({ tabId: id })  // نفس التأثير — بيحرر الذاكرة
        set(s => ({ tabs: s.tabs.map(t => t.id === id ? { ...t, isHibernated: true } : t) }))
      },

      wakeTab: (id) => {
        set(s => ({ tabs: s.tabs.map(t => t.id === id ? { ...t, isHibernated: false } : t) }))
        const tab = get().tabs.find(t => t.id === id)
        if (tab && !tab.url.startsWith('taby://')) {
          ipc?.tabCreate({ tabId: id, url: tab.url, isPrivate: tab.isStealth })
        }
        set({ activeTabId: id })
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get()
        return tabs.find(t => t.id === activeTabId)
      },

      // ── UI ─────────────────────────────────────────────────────────────
      theme:              'dark',
      sidebarOpen:        false,
      sidebarView:        'bookmarks',
      devToolsOpen:       false,
      urlBarFocused:      false,
      omniboxQuery:       '',
      commandPaletteOpen: false,

      setTheme:           (t) => set({ theme: t }),
      toggleSidebar:      (v) => set(s => ({ sidebarOpen: s.sidebarView === v ? !s.sidebarOpen : true, sidebarView: v })),
      toggleDevTools:     () => { const { activeTabId } = get(); ipc?.tabDevtools({ tabId: activeTabId }) },
      setUrlBarFocused:   (v) => set({ urlBarFocused: v }),
      setOmniboxQuery:    (q) => set({ omniboxQuery: q }),
      toggleCommandPalette:() => set(s => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      // ── Privacy ────────────────────────────────────────────────────────
      isPrivateMode:          false,
      adBlockEnabled:         true,
      fingerprintMaskEnabled: true,
      vpnEnabled:             false,

      togglePrivateMode:      () => set(s => ({ isPrivateMode: !s.isPrivateMode })),
      toggleAdBlock:          () => set(s => {
        const next = !s.adBlockEnabled
        ipc?.setAdblock(next)
        return { adBlockEnabled: next }
      }),
      toggleFingerprintMask:  () => set(s => ({ fingerprintMaskEnabled: !s.fingerprintMaskEnabled })),
      toggleVPN:              () => set(s => ({ vpnEnabled: !s.vpnEnabled })),

      // ── Downloads ──────────────────────────────────────────────────────
      downloads: [],
      addDownload:    (dl)  => set(s => ({ downloads: [dl, ...s.downloads] })),
      updateDownload: (id, up) => set(s => ({ downloads: s.downloads.map(d => d.id === id ? { ...d, ...up } : d) })),

      // ── History ────────────────────────────────────────────────────────
      history: [],
      addToHistory: (e) => set(s => ({ history: [{ ...e, visitedAt: Date.now() }, ...s.history].slice(0, 5000) })),

      // ── Bookmarks ──────────────────────────────────────────────────────
      bookmarks:      [],
      addBookmark:    (bm) => set(s => ({ bookmarks: [...s.bookmarks, bm] })),
      removeBookmark: (url) => set(s => ({ bookmarks: s.bookmarks.filter(b => b.url !== url) })),
      isBookmarked:   (url) => get().bookmarks.some(b => b.url === url),

      // ── Settings ───────────────────────────────────────────────────────
      settings: {
        searchEngine:        'google',
        homePage:            'taby://newtab',
        tabHibernationDelay: 10,
        fontSize:            16,
        language:            'ar',
        showBookmarksBar:    true,
        smoothScrolling:     true,
        hardwareAcceleration:true,
        autoPlayMedia:       false,
      },
      updateSettings: (up) => set(s => ({ settings: { ...s.settings, ...up } })),
    }),
    {
      name: 'taby-electron',
      partialize: s => ({
        theme:                  s.theme,
        bookmarks:              s.bookmarks,
        history:                s.history.slice(0, 200),
        settings:               s.settings,
        adBlockEnabled:         s.adBlockEnabled,
        fingerprintMaskEnabled: s.fingerprintMaskEnabled,
      }),
    }
  )
)

// ── IPC events listener (main → React) ─────────────────────────────────────
if (typeof window !== 'undefined' && window.taby) {
  // Tab events: loading, title, favicon, url, nav
  window.taby.on('tab-event', ({ tabId, type, value, canBack, canForward }) => {
    const { tabs } = useBrowserStore.getState()
    if (!tabs.find(t => t.id === tabId)) return

    if (type === 'loading')  useBrowserStore.getState().updateTab(tabId, { isLoading: value })
    if (type === 'title')    useBrowserStore.getState().updateTab(tabId, { title: value })
    if (type === 'favicon')  useBrowserStore.getState().updateTab(tabId, { favicon: value })
    if (type === 'url') {
      useBrowserStore.getState().updateTab(tabId, { url: value })
      // Add to history
      const t = useBrowserStore.getState().tabs.find(t => t.id === tabId)
      if (t && value && !value.startsWith('taby://')) {
        useBrowserStore.getState().addToHistory({ url: value, title: t.title || value })
        window.taby.addHistory({ url: value, title: t.title || value })
      }
    }
    if (type === 'nav') useBrowserStore.getState().updateTab(tabId, { canGoBack: canBack, canGoForward: canForward })
  })

  // Open URL in new tab (links that open new window)
  window.taby.on('open-tab', ({ url }) => {
    useBrowserStore.getState().addTab(url)
  })

  // Downloads
  window.taby.on('download-start', (dl) => {
    useBrowserStore.getState().addDownload({
      id: dl.id, filename: dl.filename, url: dl.url,
      total: dl.totalBytes, received: 0, progress: 0, status: 'downloading'
    })
  })
  window.taby.on('download-progress', ({ id, received, total }) => {
    useBrowserStore.getState().updateDownload(id, {
      received, progress: total ? Math.round((received / total) * 100) : 0
    })
  })
  window.taby.on('download-done', ({ id, state, path: dlPath }) => {
    useBrowserStore.getState().updateDownload(id, {
      status: state === 'completed' ? 'done' : 'failed',
      progress: state === 'completed' ? 100 : 0,
      path: dlPath,
    })
  })
}
