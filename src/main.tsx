import { createRoot } from 'react-dom/client'
import { App } from './App'

// Continuous 60 FPS XR frame driver using Web Worker (unthrottled by Chrome when tab is in background/occluded)
if (typeof window !== 'undefined') {
  try {
    const workerCode = `
      let interval = null;
      self.onmessage = (e) => {
        if (e.data === 'start' && !interval) {
          interval = setInterval(() => self.postMessage('tick'), 16.666);
        } else if (e.data === 'stop' && interval) {
          clearInterval(interval);
          interval = null;
        }
      };
    `
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const worker = new Worker(URL.createObjectURL(blob))
    worker.postMessage('start')

    const bgQueue: FrameRequestCallback[] = []
    let nextHandle = 1
    const handleMap = new Map<number, FrameRequestCallback>()
    const origRAF = window.requestAnimationFrame.bind(window)
    const origCancelRAF = window.cancelAnimationFrame.bind(window)

    worker.onmessage = () => {
      if (document.hidden && bgQueue.length > 0) {
        const callbacks = bgQueue.slice()
        bgQueue.length = 0
        handleMap.clear()
        const now = performance.now()
        for (const cb of callbacks) {
          try {
            cb(now)
          } catch (e) {
            console.error('BG RAF callback error:', e)
          }
        }
      }
    }

    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      if (document.hidden) {
        const h = nextHandle++
        handleMap.set(h, callback)
        bgQueue.push(callback)
        return h
      }
      return origRAF(callback)
    }

    window.cancelAnimationFrame = (id: number) => {
      if (handleMap.has(id)) {
        const cb = handleMap.get(id)!
        handleMap.delete(id)
        const idx = bgQueue.indexOf(cb)
        if (idx !== -1) bgQueue.splice(idx, 1)
        return
      }
      origCancelRAF(id)
    }
  } catch (err) {
    console.warn('Web Worker RAF fallback error:', err)
  }
}

// Remote debug logging to help diagnose XR issues in real-time
if (typeof window !== 'undefined') {
  const send = (type: string, data: any) => {
    try {
      fetch('http://127.0.0.1:9999', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, time: Date.now() }),
      }).catch(() => {})
    } catch {}
  }

  const origLog = console.log
  const origWarn = console.warn
  const origError = console.error

  console.log = (...args) => {
    origLog(...args)
    send('log', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
  }
  console.warn = (...args) => {
    origWarn(...args)
    send('warn', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
  }
  console.error = (...args) => {
    origError(...args)
    send('error', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
  }

  window.addEventListener('error', (e) => {
    send('window-error', { message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, error: e.error?.stack })
  })
  window.addEventListener('unhandledrejection', (e) => {
    send('unhandled-rejection', { reason: String(e.reason?.stack || e.reason) })
  })

  send('boot', { url: window.location.href, userAgent: navigator.userAgent })
}

createRoot(document.getElementById('root')!).render(<App />)
