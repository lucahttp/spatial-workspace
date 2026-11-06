// Web Audio synthesis - zero external audio files, 100% offline and instant

let audioCtx: AudioContext | null = null

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function playArchiveSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  // Bell chime: 587.33Hz (D5) -> 880Hz (A5) -> 1174.66Hz (D6)
  const freqs = [587.33, 880, 1174.66]
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, now + i * 0.08)

    gain.gain.setValueAtTime(0, now + i * 0.08)
    gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.6)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + i * 0.08)
    osc.stop(now + i * 0.08 + 0.65)
  })
}

export function playTrashSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  // Low resonant whoosh / thud
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(180, now)
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.25)

  gain.gain.setValueAtTime(0.15, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.3)
}

export function playClickSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, now)
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.04)

  gain.gain.setValueAtTime(0.08, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.05)
}

export function playSpotlightSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const freqs = [440, 659.25, 880]
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, now + i * 0.06)

    gain.gain.setValueAtTime(0.09, now + i * 0.06)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + i * 0.06)
    osc.stop(now + i * 0.06 + 0.45)
  })
}
