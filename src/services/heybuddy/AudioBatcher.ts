/** @module heybuddy/AudioBatcher */

// Minified AudioWorklet processor code matching mortimer-js
const workletName = 'hey-buddy'
const workletCode = `(()=>{class t extends AudioWorkletProcessor{constructor(t){super(t),this.targetSampleRate=t.processorOptions.targetSampleRate,this.inputBuffer=new Float32Array(this.inputFrameSize),this.inputBufferSize=0,this.outputBuffer=new Float32Array(this.targetFrameSize)}get inputFrameSize(){return Math.round(sampleRate/50)}get targetFrameSize(){return Math.round(this.targetSampleRate/50)}async flush(){const t=sampleRate/this.targetSampleRate;this.outputBuffer.fill(0);for(let e=0;e<this.targetFrameSize;e++){const i=e*t,r=Math.floor(i),s=Math.min(r+1,this.targetFrameSize-1),u=i-r;this.outputBuffer[e]=this.inputBuffer[r]*(1-u)+this.inputBuffer[s]*u}await this.port.postMessage(this.outputBuffer)}pushAudio(t){const e=t.length,i=this.inputFrameSize-this.inputBufferSize;if(e<i)return this.inputBuffer.set(t,this.inputBufferSize),void(this.inputBufferSize+=e);this.inputBuffer.set(t.subarray(0,i),this.inputBufferSize),this.flush(),this.inputBufferSize=0,this.pushAudio(t.subarray(i))}process(t,e,i){return this.pushAudio(t[0][0]),!0}}registerProcessor("${workletName}",t)})();`

let workletUrl: string | null = null

function getWorkletUrl(): string {
  if (!workletUrl && typeof window !== 'undefined') {
    const workletBlob = new Blob([workletCode], { type: 'application/javascript' })
    workletUrl = URL.createObjectURL(workletBlob)
  }
  return workletUrl || ''
}

export type AudioBatchCallback = (batch: Float32Array) => void

/**
 * AudioNode wrapping an AudioWorkletNode.
 */
export class AudioNode {
  context: AudioContext
  worker: AudioWorkletNode

  constructor(context: AudioContext, worker: AudioWorkletNode) {
    this.context = context
    this.worker = worker
  }

  static async create(context: AudioContext, targetSampleRate: number): Promise<AudioNode> {
    const url = getWorkletUrl()
    await context.audioWorklet.addModule(url)
    const workletOptions = {
      processorOptions: {
        targetSampleRate: targetSampleRate,
      },
    }
    const worker = new AudioWorkletNode(context, workletName, workletOptions)
    return new AudioNode(context, worker)
  }
}

/**
 * Batches audio samples and fires callbacks for wake word & VAD evaluation.
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
  workerNode: AudioNode | null

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
    this.workerNode = null
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

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true,
      },
    })

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.audioContext = new AudioContextClass()

    this.sourceNode = new MediaStreamAudioSourceNode(this.audioContext, {
      mediaStream: this.stream,
    })

    this.workerNode = await AudioNode.create(this.audioContext, this.targetSampleRate)
    this.sourceNode.connect(this.workerNode.worker)

    this.workerNode.worker.port.onmessage = (event: MessageEvent<Float32Array>) => {
      this.push(event.data)
    }

    this.clearBuffer()
    this.initialized = true
  }

  destroy(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }
    this.initialized = false
  }
}
