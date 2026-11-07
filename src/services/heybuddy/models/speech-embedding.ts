/** @module heybuddy/models/speech-embedding */
import { ONNX } from '../onnx'
import { ONNXModel } from './base'
import type * as ort from 'onnxruntime-web'

/**
 * Speech Embedding model
 * Extracts speech embeddings from mel spectrogram outputs
 */
export class SpeechEmbedding extends ONNXModel {
  embeddingDim: number
  windowSize: number
  windowStride: number

  constructor(
    modelPath = '/pretrained/speech-embedding.onnx',
    embeddingDim = 96,
    windowSize = 76,
    windowStride = 8,
    power = 0,
    webnn: number | null = 1,
    webgpu: number | null = 2,
    webgl: number | null = 3,
    wasm: number | null = 4
  ) {
    super(modelPath, power, webnn, webgpu, webgl, wasm)
    this.embeddingDim = embeddingDim
    this.windowSize = windowSize
    this.windowStride = windowStride
  }

  async test(debug = false): Promise<void> {
    try {
      const melTensor = await ONNX.createTensor(
        'float32',
        new Float32Array(new Array(100 * 32).fill(0)),
        [100, 32]
      )
      const result = (await this.run(melTensor)) as ort.Tensor
      if (result.dims.length === 2 && result.dims[0] === 4 && result.dims[1] === 96) {
        if (debug) {
          console.log(`[SpeechEmbedding] OK, executed in ${this.duration} ms`)
        }
      }
    } catch (err) {
      if (debug) console.warn('[SpeechEmbedding] Test probe warning:', err)
    }
  }

  async getEmbeddingFromMelSpectrogramOutput(melSpectrogramOutput: ort.Tensor): Promise<ort.Tensor> {
    const spectrogramBuffer = await ONNX.createTensor(
      'float32',
      melSpectrogramOutput.data as Float32Array,
      melSpectrogramOutput.dims.slice(2)
    )
    return (await this.run(spectrogramBuffer)) as ort.Tensor
  }

  async execute(spectrograms: ort.Tensor): Promise<ort.Tensor> {
    if (!this.session) throw new Error('SpeechEmbedding session not initialized')

    const [numFrames, melBins] = spectrograms.dims
    if (numFrames < this.windowSize) {
      throw new Error(`Audio too short - require ${this.windowSize} samples, got ${numFrames}`)
    }

    const numTruncatedFrames = numFrames - ((numFrames - this.windowSize) % this.windowStride)
    const numBatches = (numTruncatedFrames - this.windowSize) / this.windowStride + 1

    const embeddings = await ONNX.createTensor(
      'float32',
      new Float32Array(numBatches * this.embeddingDim),
      [numBatches, this.embeddingDim]
    )

    const windowBatches: [number, number, ort.Tensor][] = []
    const specData = spectrograms.data as Float32Array

    for (
      let windowStart = 0;
      windowStart < numTruncatedFrames - this.windowSize + this.windowStride;
      windowStart += this.windowStride
    ) {
      const windowEnd = windowStart + this.windowSize
      const windowSlice = specData.slice(windowStart * melBins, windowEnd * melBins)
      const windowTensor = await ONNX.createTensor('float32', windowSlice, [
        this.windowSize,
        melBins,
        1,
      ])
      windowBatches.push([windowStart, windowEnd, windowTensor])
    }

    const stackedWindowTensor = await ONNX.createTensor(
      'float32',
      new Float32Array(numBatches * this.windowSize * melBins),
      [numBatches, this.windowSize, melBins, 1]
    )
    const stackedData = stackedWindowTensor.data as Float32Array

    for (let i = 0; i < numBatches; i++) {
      stackedData.set(
        windowBatches[i][2].data as Float32Array,
        i * this.windowSize * melBins
      )
    }

    const output = await this.session.run({ input_1: stackedWindowTensor })
    const outData = (output.conv2d_19 ? output.conv2d_19.data : Object.values(output)[0].data) as Float32Array
    const embData = embeddings.data as Float32Array

    for (let i = 0; i < numBatches; i++) {
      embData.set(
        outData.slice(i * this.embeddingDim, (i + 1) * this.embeddingDim),
        i * this.embeddingDim
      )
    }

    return embeddings
  }
}
