/** @module heybuddy/HeyBuddy */
import { ONNX } from './onnx'
import { AudioBatcher } from './AudioBatcher'
import { SileroVAD, SpeechEmbedding, MelSpectrogram, WakeWord } from './models'
import type { WakeWordResult } from './models'
import type * as ort from 'onnxruntime-web'

export interface HeyBuddyOptions {
  debug?: boolean
  positiveVadThreshold?: number
  negativeVadThreshold?: number
  negativeVadCount?: number
  wakeWordThreads?: number
  wakeWordThreshold?: number
  wakeWordInterval?: number
  modelPath?: string | string[]
  vadModelPath?: string
  embeddingModelPath?: string
  spectrogramModelPath?: string
  batchSeconds?: number
  batchIntervalSeconds?: number
  targetSampleRate?: number
  spectrogramMelBins?: number
  embeddingDim?: number
  embeddingWindowSize?: number
  embeddingWindowStride?: number
  wakeWordEmbeddingFrames?: number
}

export interface HeyBuddyProcessedResult {
  listening: boolean
  recording: boolean
  speech: { probability: number; active: boolean }
  wakeWords: Record<string, WakeWordResult | { probability: number; active: boolean }>
}

export type DetectedCallback = () => void
export type ProcessedCallback = (result: HeyBuddyProcessedResult) => void
export type SpeechLifecycleCallback = () => void
export type RecordingCallback = (audioSamples: Float32Array) => void

/**
 * Combines an array of embedding buffers into a single embedding tensor.
 */
async function embeddingBufferArrayToEmbedding(
  embeddingBufferArray: ort.Tensor[],
  numFramesPerEmbedding: number,
  embeddingDim: number
): Promise<ort.Tensor> {
  const combinedEmptyData = new Float32Array(
    numFramesPerEmbedding * embeddingBufferArray.length * embeddingDim
  )

  const embeddingBuffer = await ONNX.createTensor('float32', combinedEmptyData, [
    numFramesPerEmbedding * embeddingBufferArray.length,
    embeddingDim,
  ])

  const embData = embeddingBuffer.data as Float32Array

  for (let i = 0; i < embeddingBufferArray.length; i++) {
    const embedding = embeddingBufferArray[i]
    embData.set(
      embedding.data as Float32Array,
      i * numFramesPerEmbedding * embeddingDim
    )
  }
  return embeddingBuffer
}

/**
 * HeyBuddy class for running continuous wake word detection
 */
export class HeyBuddy {
  debug: boolean
  wakeWordThreads: number
  wakeWordThreshold: number
  wakeWordInterval: number
  vad: SileroVAD
  spectrogram: MelSpectrogram
  spectrogramMelBins: number
  embedding: SpeechEmbedding
  embeddingDim: number
  embeddingWindowSize: number
  embeddingWindowStride: number
  embeddingBuffer: ort.Tensor | null
  embeddingBufferArray: ort.Tensor[]
  wakeWords: Record<string, WakeWord>
  wakeWordTimes: Record<string, number>
  wakeWordEmbeddingFrames: number
  recording: boolean
  paused: boolean
  audioBuffer: Float32Array | null
  frameIntervalEma: number
  frameIntervalEmaWeight: number
  frameTimeEma: number
  frameTimeEmaWeight: number
  batcher: AudioBatcher

  private speechStartCallbacks: SpeechLifecycleCallback[] = []
  private speechEndCallbacks: SpeechLifecycleCallback[] = []
  private recordingCallbacks: RecordingCallback[] = []
  private processedCallbacks: ProcessedCallback[] = []
  private detectedCallbacks: { names: string | string[]; callback: DetectedCallback }[] = []
  private frameStart = 0
  private frameEnd = 0
  private frameInterval = 0
  private frameTime = 0

  constructor(options: HeyBuddyOptions = {}) {
    this.debug = options.debug || false
    const positiveVadThreshold = options.positiveVadThreshold || 0.65
    const negativeVadThreshold = options.negativeVadThreshold || 0.4
    const negativeVadCount = options.negativeVadCount || 8
    this.wakeWordThreads = options.wakeWordThreads || 4
    this.wakeWordThreshold = options.wakeWordThreshold || 0.5
    this.wakeWordInterval = options.wakeWordInterval || 2.0

    const modelPath = options.modelPath || '/models/hey-buddy.onnx'
    const modelArray = Array.isArray(modelPath) ? modelPath : [modelPath]
    const vadModelPath = options.vadModelPath || '/pretrained/silero-vad.onnx'
    const embeddingModelPath = options.embeddingModelPath || '/pretrained/speech-embedding.onnx'
    const spectrogramModelPath = options.spectrogramModelPath || '/pretrained/mel-spectrogram.onnx'
    const batchSeconds = options.batchSeconds || 1.08
    const batchIntervalSeconds = options.batchIntervalSeconds || 0.12
    const targetSampleRate = options.targetSampleRate || 16000
    const spectrogramMelBins = options.spectrogramMelBins || 32
    const embeddingDim = options.embeddingDim || 96
    const embeddingWindowSize = options.embeddingWindowSize || 76
    const embeddingWindowStride = options.embeddingWindowStride || 8
    const wakeWordEmbeddingFrames = options.wakeWordEmbeddingFrames || 16

    // Shared models
    this.vad = new SileroVAD(
      vadModelPath,
      targetSampleRate,
      positiveVadThreshold,
      negativeVadThreshold,
      negativeVadCount
    )
    this.vad.test(this.debug)

    this.spectrogram = new MelSpectrogram(spectrogramModelPath)
    this.spectrogram.test(this.debug)
    this.spectrogramMelBins = spectrogramMelBins

    this.embedding = new SpeechEmbedding(
      embeddingModelPath,
      embeddingDim,
      embeddingWindowSize,
      embeddingWindowStride
    )
    this.embedding.test(this.debug)
    this.embeddingDim = embeddingDim
    this.embeddingWindowSize = embeddingWindowSize
    this.embeddingWindowStride = embeddingWindowStride
    this.embeddingBuffer = null
    this.embeddingBufferArray = []

    // Wake words
    this.wakeWords = {}
    this.wakeWordTimes = {}
    this.wakeWordEmbeddingFrames = wakeWordEmbeddingFrames

    for (const model of modelArray) {
      const modelName = model.split('/').pop()?.split('.')[0] || 'model'
      this.wakeWords[modelName] = new WakeWord(model, this.wakeWordThreshold)
      this.wakeWords[modelName].test(this.debug)
    }

    this.recording = false
    this.paused = false
    this.audioBuffer = null
    this.frameIntervalEma = 0
    this.frameIntervalEmaWeight = 0.1
    this.frameTimeEma = 0
    this.frameTimeEmaWeight = 0.1

    // Batcher
    this.batcher = new AudioBatcher(batchSeconds, batchIntervalSeconds, targetSampleRate)
    this.batcher.onBatch((batch) => {
      this.process(batch).catch((err) => {
        if (this.debug) console.warn('[HeyBuddy] Process batch warning:', err)
      })
    })
  }

  async start(): Promise<void> {
    await this.batcher.initialize()
  }

  stop(): void {
    this.batcher.destroy()
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
  }

  get chunkedWakeWords(): string[][] {
    return Object.keys(this.wakeWords).reduce((carry: string[][], name: string, i: number) => {
      const chunkIndex = Math.floor(i / this.wakeWordThreads)
      if (!carry[chunkIndex]) {
        carry[chunkIndex] = []
      }
      carry[chunkIndex].push(name)
      return carry
    }, [])
  }

  onDetected(names: string | string[], callback: DetectedCallback): void {
    this.detectedCallbacks.push({ names, callback })
  }

  onProcessed(callback: ProcessedCallback): void {
    this.processedCallbacks.push(callback)
  }

  onSpeechStart(callback: SpeechLifecycleCallback): void {
    this.speechStartCallbacks.push(callback)
  }

  onSpeechEnd(callback: SpeechLifecycleCallback): void {
    this.speechEndCallbacks.push(callback)
  }

  onRecording(callback: RecordingCallback): void {
    this.recordingCallbacks.push(callback)
  }

  speechStart(): void {
    if (this.debug) console.log('[HeyBuddy] Speech start')
    for (const cb of this.speechStartCallbacks) {
      cb()
    }
  }

  speechEnd(): void {
    if (this.debug) console.log('[HeyBuddy] Speech end')
    for (const cb of this.speechEndCallbacks) {
      cb()
    }
    if (this.recording) {
      this.dispatchRecording()
      this.recording = false
    }
  }

  dispatchRecording(): void {
    if (this.audioBuffer === null) {
      return
    }
    if (this.debug) {
      console.log(`[HeyBuddy] Dispatching recording with ${this.audioBuffer.length} samples`)
    }
    for (const cb of this.recordingCallbacks) {
      cb(this.audioBuffer)
    }
    this.audioBuffer = null
  }

  wakeWordDetected(name: string): void {
    const now = Date.now()
    if (
      this.wakeWordTimes[name] &&
      now - this.wakeWordTimes[name] < this.wakeWordInterval * 1000
    ) {
      return
    }
    if (this.debug) console.log('[HeyBuddy] Wake word detected:', name)
    this.recording = true
    this.wakeWordTimes[name] = now

    for (const { names, callback } of this.detectedCallbacks) {
      if ((Array.isArray(names) && names.includes(name)) || names === name) {
        callback()
      }
    }
  }

  processed(data: HeyBuddyProcessedResult): void {
    for (const cb of this.processedCallbacks) {
      cb(data)
    }
  }

  async checkWakeWordSubset(wakeWordNames: string[]): Promise<WakeWordResult[]> {
    if (!this.embeddingBuffer) return []
    return await Promise.all(
      wakeWordNames.map((name) =>
        this.wakeWords[name].checkWakeWordCalled(this.embeddingBuffer!)
      )
    )
  }

  async checkWakeWords(): Promise<Record<string, WakeWordResult>> {
    const returnMap: Record<string, WakeWordResult> = {}
    for (const nameChunk of this.chunkedWakeWords) {
      const wakeWordsCalled = await this.checkWakeWordSubset(nameChunk)
      for (let i = 0; i < nameChunk.length; i++) {
        const name = nameChunk[i]
        returnMap[name] = wakeWordsCalled[i]
      }
    }
    for (const name in returnMap) {
      if (returnMap[name].detected) {
        this.wakeWordDetected(name)
      }
    }
    return returnMap
  }

  async process(audio: Float32Array): Promise<void> {
    if (this.paused) return

    this.frameStart = Date.now()
    if (this.frameEnd) {
      this.frameInterval = this.frameStart - this.frameEnd
    } else {
      this.frameInterval = 0
    }

    if (this.frameIntervalEma === 0) {
      this.frameIntervalEma = this.frameInterval
    } else {
      this.frameIntervalEma =
        this.frameIntervalEma * (1 - this.frameIntervalEmaWeight) +
        this.frameInterval * this.frameIntervalEmaWeight
    }

    const lastBatch = audio.subarray(audio.length - this.batcher.batchIntervalSamples)

    try {
      const spectrograms = (await this.spectrogram.run(audio)) as ort.Tensor
      const embedding = await this.embedding.getEmbeddingFromMelSpectrogramOutput(spectrograms)
      const numFramesPerEmbedding = embedding.dims[0]
      const maxEmbeddings = this.wakeWordEmbeddingFrames / numFramesPerEmbedding

      this.embeddingBufferArray.push(embedding)
      if (this.embeddingBufferArray.length > maxEmbeddings) {
        this.embeddingBufferArray.shift()
      }

      this.embeddingBuffer = await embeddingBufferArrayToEmbedding(
        this.embeddingBufferArray,
        numFramesPerEmbedding,
        this.embeddingDim
      )
      const { isSpeaking, speechProbability, justStoppedSpeaking, justStartedSpeaking } =
        await this.vad.hasSpeechAudio(lastBatch)

      if (justStartedSpeaking) this.speechStart()
      if (justStoppedSpeaking) this.speechEnd()

      if (
        isSpeaking &&
        this.embeddingBuffer &&
        this.embeddingBuffer.dims[0] === this.wakeWordEmbeddingFrames
      ) {
        const wakeWordsCalled = await this.checkWakeWords()
        this.processed({
          listening: true,
          recording: this.recording,
          speech: { probability: speechProbability, active: isSpeaking },
          wakeWords: wakeWordsCalled,
        })
      } else {
        this.processed({
          listening: false,
          recording: this.recording,
          speech: { probability: speechProbability, active: isSpeaking },
          wakeWords: Object.keys(this.wakeWords).reduce(
            (carry: Record<string, { probability: number; active: boolean }>, name: string) => {
              carry[name] = { probability: 0.0, active: false }
              return carry
            },
            {}
          ),
        })
      }
    } catch (err) {
      if (this.debug) console.warn('[HeyBuddy] Processing inference error:', err)
    }

    if (this.recording) {
      if (this.audioBuffer === null) {
        this.audioBuffer = new Float32Array(audio.length)
        this.audioBuffer.set(audio)
      } else {
        const concatenated = new Float32Array(this.audioBuffer.length + lastBatch.length)
        concatenated.set(this.audioBuffer)
        concatenated.set(lastBatch, this.audioBuffer.length)
        this.audioBuffer = concatenated
      }
    }

    this.frameEnd = Date.now()
    this.frameTime = this.frameEnd - this.frameStart
    if (this.frameTimeEma === 0) {
      this.frameTimeEma = this.frameTime
    } else {
      this.frameTimeEma =
        this.frameTimeEma * (1 - this.frameTimeEmaWeight) +
        this.frameTime * this.frameTimeEmaWeight
    }
  }
}
