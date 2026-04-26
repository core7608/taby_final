// electron/preload.js — Taby Browser
// يوفر bridge آمن بين React shell والـ Electron main process

'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// كل الـ IPC calls اللي بتحتاجها الـ React shell
const taby = {
  // Tab management
  tabCreate:    (args) => ipcRenderer.invoke('tab-create', args),
  tabActivate:  (args) => ipcRenderer.invoke('tab-activate', args),
  tabClose:     (args) => ipcRenderer.invoke('tab-close', args),
  tabNavigate:  (args) => ipcRenderer.invoke('tab-navigate', args),
  tabBack:      (args) => ipcRenderer.invoke('tab-back', args),
  tabForward:   (args) => ipcRenderer.invoke('tab-forward', args),
  tabReload:    (args) => ipcRenderer.invoke('tab-reload', args),
  tabStop:      (args) => ipcRenderer.invoke('tab-stop', args),
  tabZoom:      (args) => ipcRenderer.invoke('tab-zoom', args),
  tabDevtools:  (args) => ipcRenderer.invoke('tab-devtools', args),
  tabMute:      (args) => ipcRenderer.invoke('tab-mute', args),
  tabScreenshot:(args) => ipcRenderer.invoke('tab-screenshot', args),

  // Window controls (custom titlebar)
  winMinimize:    ()    => ipcRenderer.invoke('win-minimize'),
  winMaximize:    ()    => ipcRenderer.invoke('win-maximize'),
  winClose:       ()    => ipcRenderer.invoke('win-close'),
  winIsMaximized: ()    => ipcRenderer.invoke('win-is-maximized'),

  // Settings
  setAdblock: (enabled) => ipcRenderer.invoke('set-adblock', { enabled }),

  // History (persistent via electron-store)
  addHistory: (args)  => ipcRenderer.invoke('add-history', args),
  getHistory: ()      => ipcRenderer.invoke('get-history'),

  // Downloads
  showDownloadsFolder: () => ipcRenderer.invoke('show-downloads-folder'),

  // Events from main → React
  on: (channel, fn) => {
    const allowed = [
      'tab-event', 'open-tab', 'shortcut',
      'download-start', 'download-progress', 'download-done',
      'update-ready',
    ]
    if (!allowed.includes(channel)) return () => {}
    const wrapped = (_e, ...args) => fn(...args)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },
}

contextBridge.exposeInMainWorld('taby', taby)
