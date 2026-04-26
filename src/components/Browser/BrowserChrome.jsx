import { useEffect } from 'react'
import { useBrowserStore } from '../../stores/browserStore'
import TabBar from './TabBar'
import Toolbar from './Toolbar'
import WebContent from './WebContent'
import Sidebar from './Sidebar'
import DevToolsPanel from '../DevTools/DevToolsPanel'
import StatusBar from './StatusBar'
import TitleBar from './TitleBar'

export default function BrowserChrome() {
  const { devToolsOpen, sidebarOpen } = useBrowserStore()

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}>
      {/* Custom title bar (window controls) */}
      <TitleBar />
      {/* Tab bar + Toolbar — chrome area */}
      <div className="flex flex-col flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
        <TabBar />
        <Toolbar />
      </div>
      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <div className="flex flex-col flex-1 overflow-hidden">
          {devToolsOpen
            ? <div className="flex flex-col flex-1 overflow-hidden">
                <WebContent />
                <DevToolsPanel />
              </div>
            : <WebContent />
          }
        </div>
      </div>
      <StatusBar />
    </div>
  )
}
