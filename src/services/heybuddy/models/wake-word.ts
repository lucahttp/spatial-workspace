/** @module heybuddy/models/wake-word */
import { ONNX } from '../onnx'
import { ONNXModel } from './base'
import type * as ort from 'onnxruntime-web'

export interface WakeWordResult {
  probability: number
  detected: boolean
}

/**
 * Wake Word detection model
 */
export class WakeWord extends ONNXModel {
  threshold: number

  constructor(
    modelPath: string,
    threshold = 0.5,
    power = 0,
    webnn: number | null = 1,
    webgpu: number | null = 2,
    webgl: number | null = 3,
    wasm: number | null = 4
  ) {
    super(modelPath, power, webnn, webgpu, webgl, wasm)
    this.threshold = threshold
  }

  async test(debug = false): Promise<void> {
    try {
      const embeddings = await ONNX.createTensor(
        'float32',
        new Float32Array(16 * 96).fill(0),
        [1, 16, 96]
      )
      const output = await this.run(embeddings)
      if (0.0 <= output && output <= 1.0) {
        if (debug) {
          console.log(`[WakeWord] OK, executed in ${this.duration} ms`)
        }
      }
    } catch (err) {
      if (debug) console.warn('[WakeWord] Test probe warning:', err)
    }
  }

  async execute(embeddings: ort.Tensor): Promise<number> {
    if (!this.session) throw new Error('WakeWord session not initialized')

    const input: Record<string, ort.Tensor> = {}
    if (embeddings.dims.length === 3) {
      input.input = embeddings
    } else {
      input.input = await ONNX.createTensor('float32', embeddings.data as Float32Array, [
        1,
        embeddings.dims[0],
        embeddings.dims[1],
      ])
    }
    const output = await this.session.run(input)
    const outData = (output.output ? output.output.data : Object.values(output)[0].data) as Float32Array
    return Number(outData[0])
  }

  async checkWakeWordCalled(embeddings: ort.Tensor): Promise<WakeWordResult> {
    const probability = await this.run(embeddings)
    return {
      probability,
      detected: probability >= this.threshold,
    }
  }
}
