// WebContent.jsx — في Electron، الـ WebContentsView الحقيقية بتتحكم فيها Main process
// الـ React shell بس بتظهر صفحات taby:// (New Tab, Apps, إلخ)

import { useEffect, useRef } from 'react'
import { useBrowserStore } from '../../stores/browserStore'
import NewTabPage from './NewTabPage'
import UniversalViewer from './UniversalViewer'
import TabyAppsHub, { APPS } from '../Apps/TabyAppsHub'

const APP_ROUTES = Object.fromEntries(APPS.map(a => [a.id, a.component]))

const VIEWER_EXTS = [
  'pdf','zip','rar','docx','xlsx','pptx',
  'py','js','ts','rs','go','cpp','c','java',
  'md','txt','csv','json','xml','svg','toml','yaml','yml','sh','sql'
]

const getExt = (url) => {
  try { return new URL(url).pathname.split('.').pop().toLowerCase() } catch { return '' }
}

const ipc = () => typeof window !== 'undefined' && window.taby

export default function WebContent() {
  const { tabs, activeTabId, addTab, setActiveTab, updateTab } = useBrowserStore()

  // ── عند أي تغيير في التاب النشط — أخبر Electron ──────────────────────────
  const prevActive = useRef(null)
  useEffect(() => {
    if (prevActive.current === activeTabId) return
    prevActive.current = activeTabId
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return

    if (tab.url && !tab.url.startsWith('taby://') && !tab.isHibernated) {
      // تاب ويب حقيقي — شغّل/أظهر الـ WebContentsView
      ipc()?.tabActivate({ tabId: activeTabId })
    } else {
      // صفحة taby:// — أخفي كل الـ views
      tabs.forEach(t => {
        if (!t.url.startsWith('taby://') && !t.isHibernated) {
          // نبقي موجودين بس مش visible — main.js بيعمل ده
        }
      })
    }
  }, [activeTabId, tabs])

  const openApp = (app) => {
    const existing = tabs.find(t => t.url === app.id)
    if (existing) { setActiveTab(existing.id); return }
    const id = addTab(app.id)
    setTimeout(() => {
      updateTab(id, { title: app.nameAr || app.name, favicon: app.icon })
    }, 50)
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      {tabs.map(tab => {
        const isActive  = tab.id === activeTabId
        const ext       = getExt(tab.url)
        const AppComp   = APP_ROUTES[tab.url]
        const needViewer= VIEWER_EXTS.includes(ext) && !tab.url.startsWith('taby://')
        const isWeb     = tab.url && !tab.url.startsWith('taby://') && !needViewer

        return (
          <div
            key={tab.id}
            className="absolute inset-0"
            style={{
              // صفحات taby:// تتعرض هنا في React
              // صفحات الويب الحقيقية — الـ WebContentsView من Electron فوقيها
              // بنستخدم opacity=0 عشان نخفي الـ placeholder
              opacity:       isActive ? 1 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
              zIndex:        isActive ? 1 : 0,
            }}
          >
            {tab.url === 'taby://newtab' || !tab.url
              ? <NewTabPage tabId={tab.id} onOpenApp={openApp} />
              : tab.url === 'taby://apps'
                ? <TabyAppsHub onOpenApp={openApp} />
                : AppComp
                  ? <AppComp />
                  : needViewer
                    ? <UniversalViewer url={tab.url} ext={ext} />
                    : tab.isHibernated
                      ? <HibernatedTab tab={tab} />
                      : isWeb
                        ? <WebPlaceholder tab={tab} />
                        : null
            }
          </div>
        )
      })}
    </div>
  )
}

// بلاسهولدر شفاف — الـ WebContentsView من Electron بيكون فوقيه مباشرة
function WebPlaceholder({ tab }) {
  return (
    <div
      className="absolute inset-0"
      style={{ background: 'transparent' }}
      data-web-tab={tab.id}
    />
  )
}

function HibernatedTab({ tab }) {
  const { wakeTab } = useBrowserStore()
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--surface-2)' }}>
      <div style={{ fontSize: 48 }}>💤</div>
      <div className="text-center">
        <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
          {tab.title || 'Tab Hibernated'}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          هذا التاب نائم لتوفير الذاكرة
        </p>
      </div>
      <button className="btn-primary px-6 py-2" onClick={() => wakeTab(tab.id)}>
        تنشيط
      </button>
    </div>
  )
}
