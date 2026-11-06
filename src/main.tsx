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

createRoot(document.getElementById('root')!).render(<App />)
