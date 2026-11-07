/** @module heybuddy/onnx */
import { sleep } from './helpers'
import * as ort from 'onnxruntime-web'

let initialized = false
let ortModule: typeof ort | null = null

// Initialize ONNX Runtime either from imported module or global window.ort
if (typeof window !== 'undefined' && (window as unknown as { ort?: typeof ort }).ort !== undefined) {
  ortModule = (window as unknown as { ort: typeof ort }).ort
  initialized = true
} else if (ort) {
  ortModule = ort
  initialized = true
}

/**
 * Wrapper for ONNX Runtime Web API.
 */
export class ONNX {
  /**
   * Initialize ONNX Runtime from global ort object or imported package
   */
  static initialize() {
    if (!initialized) {
      if (typeof window !== 'undefined' && (window as unknown as { ort?: typeof ort }).ort !== undefined) {
        ortModule = (window as unknown as { ort: typeof ort }).ort
        initialized = true
      } else if (ort) {
        ortModule = ort
        initialized = true
      }
    }
  }

  /**
   * Wait for the ONNX Runtime Web API to be initialized.
   */
  static async waitForInitialization(): Promise<void> {
    while (!initialized || !ortModule) {
      ONNX.initialize()
      await sleep(10)
    }
  }

  /**
   * Create a new tensor.
   */
  static async createTensor(
    dtype: 'float32' | 'int64' | 'int32' | 'bool' | string,
    data: Float32Array | Int32Array | BigInt64Array | number[] | boolean[],
    dims: readonly number[]
  ): Promise<ort.Tensor> {
    await ONNX.waitForInitialization()
    const TensorCtor = (ortModule as any).Tensor
    return new TensorCtor(dtype, data, dims)
  }

  /**
   * Create a new inference session.
   */
  static async createInferenceSession(
    model: string | ArrayBuffer | Uint8Array,
    options: ort.InferenceSession.SessionOptions = {}
  ): Promise<ort.InferenceSession> {
    await ONNX.waitForInitialization()
    return await (ortModule!.InferenceSession.create as any)(model, options)
  }
}

// Initialize immediately if possible
ONNX.initialize()
