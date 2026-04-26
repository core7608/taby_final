import { useEffect } from 'react'
import { useBrowserStore } from './stores/browserStore'
import BrowserChrome from './components/Browser/BrowserChrome'
import CommandPalette from './components/Browser/CommandPalette'
import AutoUpdater from './components/Browser/AutoUpdater'

export default function App() {
  const { theme } = useBrowserStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const handler = (e) => {
      const { addTab, closeTab, activeTabId, toggleCommandPalette, toggleDevTools } = useBrowserStore.getState()
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 't') { e.preventDefault(); addTab() }
        if (e.key === 'w') { e.preventDefault(); closeTab(activeTabId) }
        if (e.key === 'k') { e.preventDefault(); toggleCommandPalette() }
        if (e.key === 'F12' || (e.shiftKey && e.key === 'I')) { e.preventDefault(); toggleDevTools() }
        if (e.key === '1') { e.preventDefault(); useBrowserStore.getState().addTab('taby://apps') }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      {/* Liquid Glass SVG filter defs — required for iOS WebKit distortion */}
      <svg className="lg-filter-defs" aria-hidden="true">
        <defs>
          <filter id="lg-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise"/>
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise"/>
            <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended"/>
            <feComposite in="blended" in2="SourceGraphic" operator="in"/>
          </filter>
          <filter id="lg-distort" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="turbulence" baseFrequency="0.015 0.025" numOctaves="2" seed="2" result="turbulence"/>
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="6" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
      </svg>
      <BrowserChrome />
      <CommandPalette />
      <AutoUpdater />
    </>
  )
}
