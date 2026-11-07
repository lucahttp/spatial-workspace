/** @module heybuddy/AudioBatcher */

export type AudioBatchCallback = (batch: Float32Array) => void

/**
 * Batches audio samples and fires callbacks for wake word & VAD evaluation.
 * Implemented using pure Web Audio API (ScriptProcessorNode) without any blob URLs,
 * workers, or external scripts to remain 100% compliant with strict CSP (script-src 'self').
 */
export class AudioBatcher {
  initialized: boolean
  callbacks: AudioBatchCallback[]
  batchSeconds: number
  batchIntervalSeconds: number
  batchIntervalCount: number
  targetSampleRate: number
  buffer: Float32Array
  stream: MediaStream | null
  audioContext: AudioContext | null
  sourceNode: MediaStreamAudioSourceNode | null
  processorNode: ScriptProcessorNode | null

  constructor(
    batchSeconds = 2.0,
    batchIntervalSeconds = 0.05,
    targetSampleRate = 16000
  ) {
    this.initialized = false
    this.callbacks = []
    this.batchSeconds = batchSeconds
    this.batchIntervalSeconds = batchIntervalSeconds
    this.batchIntervalCount = 0
    this.targetSampleRate = targetSampleRate
    this.buffer = new Float32Array(this.batchSamples)
    this.buffer.fill(0)
    this.stream = null
    this.audioContext = null
    this.sourceNode = null
    this.processorNode = null
  }

  get batchSamples(): number {
    return Math.floor(this.batchSeconds * this.targetSampleRate)
  }

  get batchIntervalSamples(): number {
    return Math.floor(this.batchIntervalSeconds * this.targetSampleRate)
  }

  clearBuffer(): void {
    this.buffer.fill(0)
  }

  push(data: Float32Array): void {
    const dataLength = data.length
    this.buffer.set(this.buffer.subarray(dataLength))
    this.buffer.set(data, this.buffer.length - dataLength)
    this.batchIntervalCount += dataLength
    if (this.batchIntervalCount >= this.batchIntervalSamples) {
      for (const callback of this.callbacks) {
        callback(this.buffer)
      }
      this.batchIntervalCount = 0
    }
  }

  onBatch(callback: AudioBatchCallback): void {
    this.callbacks.push(callback)
  }

  offBatch(callback: AudioBatchCallback): void {
    this.callbacks = this.callbacks.filter((c) => c !== callback)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      })

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.audioContext = new AudioContextClass()

      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream)

      // ScriptProcessor buffer size: 4096 frames
      const bufferSize = 4096
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1)

      const actualSampleRate = this.audioContext.sampleRate
      const ratio = actualSampleRate / this.targetSampleRate

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        const inputData = e.inputBuffer.getChannelData(0)
        const targetLength = Math.round(inputData.length / ratio)
        const resampled = new Float32Array(targetLength)

        // Linear interpolation downsampling to 16kHz
        for (let i = 0; i < targetLength; i++) {
          const originalIndex = i * ratio
          const indexFloor = Math.floor(originalIndex)
          const indexCeil = Math.min(indexFloor + 1, inputData.length - 1)
          const fraction = originalIndex - indexFloor
          resampled[i] = inputData[indexFloor] * (1 - fraction) + inputData[indexCeil] * fraction
        }

        this.push(resampled)
      }

      this.sourceNode.connect(this.processorNode)
      this.processorNode.connect(this.audioContext.destination)

      this.clearBuffer()
      this.initialized = true
    } catch (err) {
      console.warn('[AudioBatcher] Initialization warning (CSP or microphone access):', err)
      throw err
    }
  }

  destroy(): void {
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode.onaudioprocess = null
      this.processorNode = null
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
    }
    this.initialized = false
  }
}
