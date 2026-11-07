import { createRoot } from 'react-dom/client'
import { App } from './App'

// Background frame driver for XR/Tab occlusion without CSP blob-worker violations
if (typeof window !== 'undefined') {
  try {
    const bgQueue: FrameRequestCallback[] = []
    let nextHandle = 1
    const handleMap = new Map<number, FrameRequestCallback>()
    const origRAF = window.requestAnimationFrame.bind(window)
    const origCancelRAF = window.cancelAnimationFrame.bind(window)

    // Main-thread fallback interval when tab is occluded
    let fallbackInterval: number | null = null

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (!fallbackInterval) {
          fallbackInterval = window.setInterval(() => {
            if (bgQueue.length > 0) {
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
          }, 16.666)
        }
      } else {
        if (fallbackInterval) {
          window.clearInterval(fallbackInterval)
          fallbackInterval = null
        }
      }
    })

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
    console.warn('RAF fallback initialization warning:', err)
  }
}

createRoot(document.getElementById('root')!).render(<App />)
