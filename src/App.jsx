import { useEffect } from 'react'
import { useBrowserStore } from './stores/browserStore'
import BrowserChrome from './components/Browser/BrowserChrome'
import CommandPalette from './components/Browser/CommandPalette'
import AutoUpdater from './components/Browser/AutoUpdater'

export default function App() {
  const { theme, addTab, closeTab, activeTabId, toggleCommandPalette, toggleDevTools } = useBrowserStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 't') { e.preventDefault(); addTab() }
      if (ctrl && e.key === 'w') { e.preventDefault(); closeTab(activeTabId) }
      if (ctrl && e.key === 'k') { e.preventDefault(); toggleCommandPalette() }
      if (e.key === 'F12') { e.preventDefault(); toggleDevTools() }
      if (ctrl && e.key === '1') { e.preventDefault(); addTab('taby://apps') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTabId])

  return (
    <>
      <BrowserChrome />
      <CommandPalette />
      <AutoUpdater />
    </>
  )
}
