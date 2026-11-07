/** @module heybuddy/models/base */
import { sleep } from '../helpers'
import { ONNX, isWasmSupported } from '../onnx'
import type * as ort from 'onnxruntime-web'

/**
 * Base class for ONNX models in HeyBuddy
 */
export abstract class ONNXModel {
  modelPath: string
  session: ort.InferenceSession | null = null
  duration = 0.0
  ema = 0.1
  lastTime = 0.0
  webnn: number | null
  webgpu: number | null
  webgl: number | null
  wasm: number | null
  power: number
  isAvailable = false

  constructor(
    modelPath: string,
    power = 0,
    webnn: number | null = 1,
    webgpu: number | null = 2,
    webgl: number | null = 3,
    wasm: number | null = 4
  ) {
    this.modelPath = modelPath
    this.power = power
    this.webnn = webnn
    this.webgpu = webgpu
    this.webgl = webgl
    this.wasm = wasm

    if (typeof window !== 'undefined' && isWasmSupported()) {
      this.load().catch((err) => {
        console.warn(`[HeyBuddy] Failed to pre-load model from ${this.modelPath}:`, err)
      })
    }
  }

  get sessionOptions(): ort.InferenceSession.SessionOptions {
    return {
      executionProviders: ['wasm'],
    }
  }

  async load(): Promise<void> {
    if (!isWasmSupported()) {
      this.isAvailable = false
      return
    }

    if (!this.session) {
      try {
        this.session = await ONNX.createInferenceSession(
          this.modelPath,
          this.sessionOptions
        )
        this.isAvailable = true
      } catch (err) {
        this.isAvailable = false
        console.warn(`[HeyBuddy] Could not initialize session for ${this.modelPath}:`, err)
      }
    }
  }

  async waitUntilLoaded(): Promise<boolean> {
    if (!isWasmSupported()) return false
    let attempts = 0
    while (this.session === null && attempts < 50) {
      await sleep(10)
      attempts++
    }
    return this.session !== null
  }

  abstract execute(input: unknown): Promise<unknown>

  async run(input: unknown): Promise<any> {
    const ready = await this.waitUntilLoaded()
    if (!ready || !this.session) {
      return null
    }

    const currentTime = Date.now()
    const result = await this.execute(input)
    const executionDuration = Date.now() - currentTime
    if (this.duration === 0.0) {
      this.duration = executionDuration
    } else {
      this.duration = (1.0 - this.ema) * this.duration + this.ema * executionDuration
    }
    this.lastTime = currentTime
    return result
  }
}
