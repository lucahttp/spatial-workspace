/** @module heybuddy/onnx */
import { sleep } from './helpers'
import * as ort from 'onnxruntime-web'

let initialized = false
let ortModule: typeof ort | null = null
let wasmAllowed: boolean | null = null

/**
 * Checks whether WebAssembly compilation is allowed under the current CSP
 */
export function isWasmSupported(): boolean {
  if (wasmAllowed !== null) return wasmAllowed
  if (typeof WebAssembly === 'undefined') {
    wasmAllowed = false
    return false
  }
  try {
    // Minimal valid WebAssembly binary: \0asm\1\0\0\0
    const minimalWasm = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    const mod = new WebAssembly.Module(minimalWasm)
    wasmAllowed = Boolean(mod)
  } catch (err) {
    console.warn('[ONNX] WebAssembly compilation blocked by CSP policy:', err)
    wasmAllowed = false
  }
  return wasmAllowed
}

// Initialize ONNX Runtime either from imported module or global window.ort if WASM is permitted
if (typeof window !== 'undefined' && isWasmSupported()) {
  if ((window as unknown as { ort?: typeof ort }).ort !== undefined) {
    ortModule = (window as unknown as { ort: typeof ort }).ort
    initialized = true
  } else if (ort) {
    ortModule = ort
    initialized = true
  }
}

/**
 * Wrapper for ONNX Runtime Web API.
 */
export class ONNX {
  /**
   * Initialize ONNX Runtime from global ort object or imported package
   */
  static initialize() {
    if (!isWasmSupported()) return

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
  static async waitForInitialization(): Promise<boolean> {
    if (!isWasmSupported()) return false
    let attempts = 0
    while ((!initialized || !ortModule) && attempts < 50) {
      ONNX.initialize()
      await sleep(10)
      attempts++
    }
    return initialized && ortModule !== null
  }

  /**
   * Create a new tensor.
   */
  static async createTensor(
    dtype: 'float32' | 'int64' | 'int32' | 'bool' | string,
    data: Float32Array | Int32Array | BigInt64Array | number[] | boolean[],
    dims: readonly number[]
  ): Promise<ort.Tensor> {
    const ready = await ONNX.waitForInitialization()
    if (!ready || !ortModule) {
      throw new Error('ONNX runtime not available (CSP or unsupported)')
    }
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
    const ready = await ONNX.waitForInitialization()
    if (!ready || !ortModule) {
      throw new Error('ONNX runtime not available (CSP or unsupported)')
    }
    return await (ortModule.InferenceSession.create as any)(model, options)
  }
}

// Initialize immediately if possible
ONNX.initialize()
