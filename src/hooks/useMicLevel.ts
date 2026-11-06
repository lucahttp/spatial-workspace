import { useEffect, useRef, useState } from 'react'

/**
 * Real microphone level (0..1) from the Web Audio API.
 * Opt-in: the headset asks for permission, so we never auto-request.
 */
export function useMicLevel() {
  const [enabled, setEnabled] = useState(false)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const ctx = new AudioContext()
        ctxRef.current = ctx
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        ctx.createMediaStreamSource(stream).connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)

        const tick = () => {
          analyser.getByteFrequencyData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
          setLevel(Math.min(1, Math.sqrt(sum / data.length) / 90))
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setEnabled(false)
      }
    }
    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      ctxRef.current?.close()
      ctxRef.current = null
    }
  }, [enabled])

  return { enabled, level, error, enable: () => setEnabled(true), disable: () => setEnabled(false) }
}
