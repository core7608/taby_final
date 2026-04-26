import { useState, useEffect } from 'react'
import { Download, X, RefreshCw, CheckCircle, ArrowUp, Zap } from 'lucide-react'

// Safe Tauri detection
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export default function AutoUpdater() {
  const [status, setStatus]       = useState('idle') // idle|available|downloading|ready|error
  const [progress, setProgress]   = useState(0)
  const [dlBytes, setDlBytes]     = useState(0)
  const [totalBytes, setTotal]    = useState(0)
  const [notes, setNotes]         = useState('')
  const [newVersion, setNewVersion] = useState('')
  const [curVersion, setCurVersion] = useState('1.0.0')
  const [dismissed, setDismissed] = useState(false)
  const [error, setError]         = useState('')
  const [updateObj, setUpdateObj] = useState(null)

  // Get current version
  useEffect(() => {
    if (!isTauri) return
    import('@tauri-apps/api/app')
      .then(({ getVersion }) => getVersion().then(v => setCurVersion(v)))
      .catch(() => {})
  }, [])

  // Check on mount + every 4h
  useEffect(() => {
    const doCheck = () => checkUpdate()
    doCheck()
    const id = setInterval(doCheck, 4 * 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // Listen for manual trigger from Rust
  useEffect(() => {
    if (!isTauri) return
    let unlisten
    import('@tauri-apps/api/event')
      .then(({ listen }) => listen('check-update', () => checkUpdate()).then(fn => { unlisten = fn }))
      .catch(() => {})
    return () => { unlisten?.() }
  }, [])

  const checkUpdate = async () => {
    if (!isTauri) return
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (update?.available) {
        setUpdateObj(update)
        setNewVersion(update.version || '')
        setNotes(update.body || 'Bug fixes and performance improvements.')
        setStatus('available')
        setDismissed(false)
      }
    } catch (e) {
      // Silently fail - updater not configured or no internet
      console.warn('Update check failed:', e)
    }
  }

  const startDownload = async () => {
    if (!updateObj) return
    setStatus('downloading')
    setProgress(0)
    try {
      let downloaded = 0
      await updateObj.downloadAndInstall((evt) => {
        if (evt.event === 'Started') {
          setTotal(evt.data.contentLength || 0)
        } else if (evt.event === 'Progress') {
          downloaded += evt.data.chunkLength
          setDlBytes(downloaded)
          if (totalBytes > 0) setProgress(Math.round((downloaded / totalBytes) * 100))
        } else if (evt.event === 'Finished') {
          setStatus('ready')
          setProgress(100)
        }
      })
    } catch (e) {
      setStatus('error')
      setError(e.message || 'Download failed')
    }
  }

  const restartNow = async () => {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch (e) {
      console.error('Relaunch failed:', e)
    }
  }

  const fmt = (b) => b < 1048576 ? `${(b/1024).toFixed(0)}KB` : `${(b/1048576).toFixed(1)}MB`

  if (dismissed || status === 'idle') return null

  if (status === 'error') return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
      <div className="panel flex items-center gap-3 px-4 py-3" style={{ borderLeft: '3px solid #ef4444', maxWidth: 360 }}>
        <span className="text-sm flex-1" style={{ color: '#ef4444' }}>⚠️ {error}</span>
        <button onClick={() => setStatus('idle')} className="btn-ghost p-1 rounded"><X size={13}/></button>
      </div>
    </div>
  )

  const isReady = status === 'ready'
  const accent  = isReady ? '#16a34a' : '#2a8bff'

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in" style={{ width: 360 }}>
      <div className="panel overflow-hidden" style={{ borderLeft: `3px solid ${accent}` }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: accent + '20' }}>
            {isReady
              ? <CheckCircle size={16} style={{ color: accent }}/>
              : status === 'downloading'
                ? <Download size={16} className="animate-bounce" style={{ color: accent }}/>
                : <ArrowUp size={16} style={{ color: accent }}/>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {isReady ? '✅ Update Ready!' : status === 'downloading' ? 'Downloading...' : '🆕 Update Available'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              v{curVersion} → <strong style={{ color: accent }}>v{newVersion}</strong>
            </p>
          </div>
          {status !== 'downloading' && (
            <button onClick={() => setDismissed(true)} className="btn-ghost p-1 rounded">
              <X size={13}/>
            </button>
          )}
        </div>

        {/* Changelog */}
        {status === 'available' && notes && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>WHAT'S NEW</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{notes}</p>
          </div>
        )}

        {/* Progress bar */}
        {status === 'downloading' && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex justify-between mb-1.5 text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>
                {fmt(dlBytes)} {totalBytes > 0 && `/ ${fmt(totalBytes)}`}
              </span>
              <span style={{ color: accent, fontWeight: 700 }}>{progress}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, #2a8bff, #0d6bff)` }}/>
            </div>
            <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-tertiary)' }}>
              لا تغلق المتصفح أثناء التحميل
            </p>
          </div>
        )}

        {/* Ready banner */}
        {isReady && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(22,163,74,0.08)' }}>
              <Zap size={14} style={{ color: '#16a34a' }}/>
              <p className="text-xs" style={{ color: '#16a34a' }}>
                تم التنزيل — أعد التشغيل لتطبيق التحديث
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 px-4 py-3">
          {status === 'available' && (<>
            <button onClick={() => setDismissed(true)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              لاحقاً
            </button>
            <button onClick={startDownload}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #2a8bff, #0d6bff)' }}>
              <Download size={14}/> تحديث الآن
            </button>
          </>)}

          {status === 'downloading' && (
            <button disabled className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)', cursor: 'not-allowed' }}>
              <RefreshCw size={13} className="animate-spin"/> جاري التحميل {progress}%
            </button>
          )}

          {isReady && (<>
            <button onClick={() => setDismissed(true)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              لاحقاً
            </button>
            <button onClick={restartNow}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{ background: '#16a34a' }}>
              <RefreshCw size={14}/> إعادة التشغيل
            </button>
          </>)}
        </div>

        <p className="px-4 pb-3 text-center" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          🔐 التحديثات موقّعة رقمياً ومشفّرة
        </p>
      </div>
    </div>
  )
}
