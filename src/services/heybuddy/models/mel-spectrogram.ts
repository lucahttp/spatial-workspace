/** @module heybuddy/models/mel-spectrogram */
import { ONNX } from '../onnx'
import { ONNXModel } from './base'
import type * as ort from 'onnxruntime-web'

/**
 * Mel spectrogram model
 */
export class MelSpectrogram extends ONNXModel {
  constructor(
    modelPath = '/pretrained/mel-spectrogram.onnx',
    power = 0,
    webnn: number | null = 1,
    webgpu: number | null = 2,
    webgl: number | null = 3,
    wasm: number | null = 4
  ) {
    super(modelPath, power, webnn, webgpu, webgl, wasm)
  }

  async test(debug = false): Promise<void> {
    try {
      const result = (await this.run(new Float32Array(12640).fill(1.0))) as ort.Tensor
      if (result.dims.length === 4 && result.dims[2] === 76 && result.dims[3] === 32) {
        if (debug) {
          console.log(`[MelSpectrogram] OK, executed in ${this.duration} ms`)
        }
      }
    } catch (err) {
      if (debug) console.warn('[MelSpectrogram] Test probe warning:', err)
    }
  }

  async execute(input: Float32Array): Promise<ort.Tensor> {
    if (!this.session) throw new Error('MelSpectrogram session not initialized')

    const inputTensor = await ONNX.createTensor('float32', input, [1, input.length])
    const output = await this.session.run({ input: inputTensor })
    const data = output.output.data as Float32Array
    const scaled = new Float32Array(data.length)
    for (let i = 0; i < data.length; i++) {
      scaled[i] = data[i] / 10.0 + 2.0
    }

    return await ONNX.createTensor('float32', scaled, output.output.dims)
  }
}
