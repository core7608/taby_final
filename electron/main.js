// electron/main.js — Taby Browser
// Real WebContentsView per tab · Chrome UA · Works on Win/Mac/Linux

'use strict'

const {
  app, BrowserWindow, WebContentsView, ipcMain,
  session, Menu, Tray, nativeImage, shell, dialog,
  nativeTheme, globalShortcut
} = require('electron')
const path   = require('path')
const Store  = require('electron-store')
const { autoUpdater } = require('electron-updater')

// ── Constants ─────────────────────────────────────────────────────────────────
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36'

const IS_DEV  = process.env.ELECTRON_DEV === '1' || !app.isPackaged
const SHELL_URL = IS_DEV ? 'http://localhost:1420' : `file://${path.join(__dirname, '../dist/index.html')}`
const CHROME_H  = 88   // TabBar(40) + Toolbar(48) — يتطابق مع CSS
const store     = new Store()

// ── State ─────────────────────────────────────────────────────────────────────
let mainWin   = null
let tray      = null
const views   = new Map()   // tabId → WebContentsView
let activeId  = null

// ── Ad-block domains (بسيط، يشتغل فعلاً) ────────────────────────────────────
const AD_DOMAINS = [
  'doubleclick.net','googlesyndication.com','googletagmanager.com',
  'facebook.com/tr','analytics.google.com','scorecardresearch.com',
  'outbrain.com','taboola.com','quantserve.com','ads.youtube.com',
  'adservice.google.com','pagead2.googlesyndication.com',
  'tpc.googlesyndication.com','static.doubleclick.net',
]

let adBlockEnabled = store.get('adBlockEnabled', true)

// ── Session tweaks ────────────────────────────────────────────────────────────
function setupSession(ses) {
  // 1. Chrome UA على مستوى الـ session
  ses.setUserAgent(CHROME_UA)

  // 2. إزالة X-Frame-Options و CSP من كل الـ responses
  ses.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, cb) => {
    const h = Object.fromEntries(
      Object.entries(details.responseHeaders || {})
        .filter(([k]) => !['x-frame-options','content-security-policy',
                           'content-security-policy-report-only'].includes(k.toLowerCase()))
    )
    cb({ responseHeaders: h })
  })

  // 3. Ad-block: فلتر قبل ما الـ request يتبعت
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, cb) => {
    if (adBlockEnabled) {
      const blocked = AD_DOMAINS.some(d => details.url.includes(d))
      if (blocked) { cb({ cancel: true }); return }
    }
    cb({ cancel: false })
  })
}

// ── Create main window ────────────────────────────────────────────────────────
function createWindow() {
  mainWin = new BrowserWindow({
    width:  store.get('winWidth',  1280),
    height: store.get('winHeight', 800),
    minWidth:  900,
    minHeight: 600,
    frame:     false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 12, y: 16 },
    backgroundColor: '#141720',
    show: false,
    icon: path.join(__dirname, '../public/taby-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,   // نستخدم WebContentsView مش webview tag
    },
  })

  setupSession(mainWin.webContents.session)

  mainWin.loadURL(SHELL_URL)

  mainWin.once('ready-to-show', () => {
    mainWin.show()
    if (IS_DEV) mainWin.webContents.openDevTools({ mode: 'detach' })
  })

  mainWin.on('resize', () => {
    syncViewBounds()
    const [w, h] = mainWin.getContentSize()
    store.set('winWidth', w); store.set('winHeight', h)
  })

  mainWin.on('closed', () => {
    views.forEach(v => v.webContents.destroy())
    views.clear()
    mainWin = null
  })

  // Keyboard shortcuts
  mainWin.webContents.on('before-input-event', (_e, input) => {
    if (!mainWin) return
    const ctrl = input.control || input.meta
    if (ctrl && input.key === 'r') {
      const v = views.get(activeId)
      if (v) v.webContents.reload()
    }
    if (input.key === 'F12') {
      const v = views.get(activeId)
      if (v) v.webContents.toggleDevTools()
    }
  })
}

// ── View bounds helper ────────────────────────────────────────────────────────
function getContentBounds() {
  if (!mainWin) return { x: 0, y: CHROME_H, width: 800, height: 500 }
  const [w, h] = mainWin.getContentSize()
  return { x: 0, y: CHROME_H, width: w, height: Math.max(0, h - CHROME_H) }
}

function syncViewBounds() {
  const b = getContentBounds()
  views.forEach(v => v.setBounds(b))
}

// ── Tab WebContentsView management ────────────────────────────────────────────
function createView(tabId, url, isPrivate) {
  const partition = isPrivate ? 'private' : 'persist:default'
  const ses = session.fromPartition(partition)
  setupSession(ses)

  const view = new WebContentsView({
    webPreferences: {
      session: ses,
      contextIsolation: true,
      nodeIntegration: false,
      userAgent: CHROME_UA,
      allowRunningInsecureContent: false,
      webSecurity: true,
    },
  })

  view.webContents.setUserAgent(CHROME_UA)

  // Events → shell
  const send = (type, data) => mainWin?.webContents.send('tab-event', { tabId, type, ...data })

  view.webContents.on('did-start-loading',    ()    => send('loading',  { value: true }))
  view.webContents.on('did-stop-loading',     ()    => send('loading',  { value: false }))
  view.webContents.on('page-title-updated',   (_,t) => send('title',    { value: t }))
  view.webContents.on('page-favicon-updated', (_,f) => send('favicon',  { value: f[0] }))
  view.webContents.on('did-navigate',         (_,u) => {
    send('url', { value: u })
    send('nav', { canBack: view.webContents.canGoBack(), canForward: view.webContents.canGoForward() })
  })
  view.webContents.on('did-navigate-in-page', (_,u) => {
    send('url', { value: u })
    send('nav', { canBack: view.webContents.canGoBack(), canForward: view.webContents.canGoForward() })
  })

  // فتح نوافذ جديدة في تاب جديد
  view.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    mainWin?.webContents.send('open-tab', { url: newUrl })
    return { action: 'deny' }
  })

  // تحميل الصفحة
  if (url && url !== 'taby://newtab') {
    view.webContents.loadURL(url).catch(() => {})
  }

  views.set(tabId, view)
  mainWin.contentView.addChildView(view)
  view.setBounds(getContentBounds())

  return view
}

function showView(tabId) {
  if (!mainWin) return
  views.forEach((v, id) => {
    v.setVisible(id === tabId)
  })
  activeId = tabId
}

function destroyView(tabId) {
  const v = views.get(tabId)
  if (!v) return
  try { mainWin?.contentView.removeChildView(v) } catch (_) {}
  try { v.webContents.destroy() } catch (_) {}
  views.delete(tabId)
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('tab-create', (_e, { tabId, url, isPrivate }) => {
  if (!views.has(tabId)) createView(tabId, url, isPrivate)
  showView(tabId)
})

ipcMain.handle('tab-activate', (_e, { tabId }) => {
  if (!views.has(tabId)) return
  showView(tabId)
})

ipcMain.handle('tab-close', (_e, { tabId }) => {
  destroyView(tabId)
})

ipcMain.handle('tab-navigate', (_e, { tabId, url }) => {
  const v = views.get(tabId)
  if (!v) return
  const finalUrl = url.startsWith('http') ? url : `https://${url}`
  v.webContents.loadURL(finalUrl).catch(err =>
    v.webContents.loadURL(`data:text/html,<h2>Cannot load: ${err.message}</h2>`)
  )
})

ipcMain.handle('tab-back',    (_e, { tabId }) => { const v = views.get(tabId); if (v?.webContents.canGoBack())    v.webContents.goBack() })
ipcMain.handle('tab-forward', (_e, { tabId }) => { const v = views.get(tabId); if (v?.webContents.canGoForward()) v.webContents.goForward() })
ipcMain.handle('tab-reload',  (_e, { tabId }) => { const v = views.get(tabId); if (v) v.webContents.reload() })
ipcMain.handle('tab-stop',    (_e, { tabId }) => { const v = views.get(tabId); if (v) v.webContents.stop() })

ipcMain.handle('tab-zoom', (_e, { tabId, factor }) => {
  const v = views.get(tabId)
  if (v) v.webContents.setZoomFactor(factor / 100)
})

ipcMain.handle('tab-devtools', (_e, { tabId }) => {
  const v = views.get(tabId)
  if (v) v.webContents.toggleDevTools()
})

ipcMain.handle('tab-mute', (_e, { tabId, muted }) => {
  const v = views.get(tabId)
  if (v) v.webContents.setAudioMuted(muted)
})

ipcMain.handle('tab-screenshot', async (_e, { tabId }) => {
  const v = views.get(tabId)
  if (!v) return null
  const img = await v.webContents.capturePage()
  return img.toDataURL()
})

// Chrome H offset — حدود المحتوى بتتغير لما الشريط العلوي يتغير
ipcMain.handle('set-chrome-height', (_e, { height }) => {
  // CHROME_H = height  // dynamic if needed
  syncViewBounds()
})

// Adblock toggle
ipcMain.handle('set-adblock', (_e, { enabled }) => {
  adBlockEnabled = enabled
  store.set('adBlockEnabled', enabled)
})

// Window controls
ipcMain.handle('win-minimize', () => mainWin?.minimize())
ipcMain.handle('win-maximize', () => mainWin?.isMaximized() ? mainWin.unmaximize() : mainWin.maximize())
ipcMain.handle('win-close',    () => mainWin?.close())
ipcMain.handle('win-is-maximized', () => mainWin?.isMaximized() ?? false)

// Downloads
ipcMain.handle('show-downloads-folder', () => {
  shell.openPath(app.getPath('downloads'))
})

// Downloads hook
app.on('browser-window-created', (_e, win) => {
  win.webContents.session.on('will-download', (_e2, item) => {
    const savePath = path.join(app.getPath('downloads'), item.getFilename())
    item.setSavePath(savePath)
    const dlId = Date.now().toString()

    mainWin?.webContents.send('download-start', {
      id: dlId, filename: item.getFilename(),
      url: item.getURL(), totalBytes: item.getTotalBytes(),
    })

    item.on('updated', (_e3, state) => {
      if (state === 'progressing') {
        mainWin?.webContents.send('download-progress', {
          id: dlId,
          received: item.getReceivedBytes(),
          total: item.getTotalBytes(),
        })
      }
    })

    item.once('done', (_e3, state) => {
      mainWin?.webContents.send('download-done', {
        id: dlId, state, path: savePath,
      })
    })
  })
})

// History from views
ipcMain.handle('add-history', (_e, { url, title }) => {
  const h = store.get('history', [])
  h.unshift({ url, title, visitedAt: Date.now() })
  store.set('history', h.slice(0, 5000))
})

ipcMain.handle('get-history', () => store.get('history', []))

// ── Tray ──────────────────────────────────────────────────────────────────────
function setupTray() {
  try {
    const iconPath = path.join(__dirname, '../public/taby-icon.png')
    const img = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(img)
    tray.setToolTip('Taby Browser')
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Taby', click: () => { mainWin?.show(); mainWin?.focus() } },
      { label: 'New Tab',   click: () => { mainWin?.show(); mainWin?.webContents.send('shortcut', 'new-tab') } },
      { type: 'separator' },
      { label: 'Quit', role: 'quit' },
    ]))
    tray.on('click', () => { mainWin?.show(); mainWin?.focus() })
  } catch (_) {}
}

// ── Auto-updater ──────────────────────────────────────────────────────────────
function setupUpdater() {
  if (IS_DEV) return
  autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  autoUpdater.on('update-downloaded', () => {
    mainWin?.webContents.send('update-ready')
  })
  ipcMain.handle('install-update', () => autoUpdater.quitAndInstall())
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  setupTray()
  setupUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWin?.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
