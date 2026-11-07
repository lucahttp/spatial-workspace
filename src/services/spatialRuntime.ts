/**
 * Spatial Runtime & Terminal Streamer
 * Inspired by wZed's in-browser execution model.
 * Executes JavaScript/Node mock scripts, captures console streams,
 * and passes visual UI updates directly to the 3D Web Preview.
 */

import { vfs } from './vfs'

export interface LogLine {
  id: string
  type: 'log' | 'info' | 'warn' | 'error' | 'system' | 'command'
  text: string
  timestamp: string
}

export interface ExecutionResult {
  ok: boolean
  result?: unknown
  error?: string
  elapsedMs: number
}

type OutputListener = (lines: LogLine[]) => void
type PreviewListener = (htmlOrData: string) => void

class SpatialRuntime {
  private logs: LogLine[] = []
  private outputListeners: Set<OutputListener> = new Set()
  private previewListeners: Set<PreviewListener> = new Set()
  private lineCounter = 0

  constructor() {
    this.addLog('system', 'wZed Spatial Runtime v1.0 (In-Browser VFS) ready.')
    this.addLog('system', "Tip: Presiona '▶ Ejecutar' o escribe comandos para correr código.")
  }

  public subscribe(listener: OutputListener): () => void {
    this.outputListeners.add(listener)
    listener(this.logs)
    return () => this.outputListeners.delete(listener)
  }

  public onPreview(listener: PreviewListener): () => void {
    this.previewListeners.add(listener)
    return () => this.previewListeners.delete(listener)
  }

  public getLogs(): LogLine[] {
    return [...this.logs]
  }

  public clear() {
    this.logs = []
    this.notify()
  }

  private addLog(type: LogLine['type'], text: string) {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    this.logs.push({
      id: `log-${Date.now()}-${this.lineCounter++}`,
      type,
      text,
      timestamp: time,
    })
    if (this.logs.length > 250) {
      this.logs.shift()
    }
    this.notify()
  }

  private notify() {
    this.outputListeners.forEach((cb) => cb(this.logs))
  }

  private notifyPreview(html: string) {
    this.previewListeners.forEach((cb) => cb(html))
  }

  /**
   * Safe asynchronous execution of script with intercepted console.
   */
  public async executeScript(code: string, fileName = 'index.js'): Promise<ExecutionResult> {
    this.addLog('command', `node ${fileName}`)
    const start = performance.now()

    const customConsole = {
      log: (...args: unknown[]) => this.addLog('log', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      info: (...args: unknown[]) => this.addLog('info', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      warn: (...args: unknown[]) => this.addLog('warn', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      error: (...args: unknown[]) => this.addLog('error', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
    }

    try {
      // AsyncFunction constructor for execution
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
      const runner = new AsyncFunction('console', 'vfs', code)
      const res = await runner(customConsole, vfs)
      const elapsed = Math.round(performance.now() - start)

      if (res !== undefined) {
        if (typeof res === 'string' && (res.includes('<div') || res.includes('<h2') || res.includes('<p'))) {
          this.notifyPreview(res)
          this.addLog('system', `✨ Salida visual enviada a Web Preview (${elapsed}ms)`)
        } else {
          this.addLog('info', `➜ Retorno: ${typeof res === 'object' ? JSON.stringify(res) : String(res)}`)
        }
      }
      return { ok: true, result: res, elapsedMs: elapsed }
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - start)
      const errMsg = err instanceof Error ? err.message : String(err)
      this.addLog('error', `❌ Error: ${errMsg}`)
      return { ok: false, error: errMsg, elapsedMs: elapsed }
    }
  }

  public async runFile(path: string): Promise<ExecutionResult> {
    const content = vfs.readFile(path)
    if (content === undefined) {
      this.addLog('error', `Archivo no encontrado: ${path}`)
      return { ok: false, error: 'File not found', elapsedMs: 0 }
    }
    const name = path.split('/').pop() || path
    return this.executeScript(content, name)
  }

  public async execCommand(cmd: string): Promise<void> {
    const trimmed = cmd.trim()
    if (!trimmed) return

    if (trimmed === 'clear') {
      this.clear()
      return
    }

    if (trimmed === 'ls') {
      this.addLog('command', 'ls /project')
      const files = vfs.getFilePaths()
      files.forEach((f) => this.addLog('log', f.replace('/project/', '')))
      return
    }

    if (trimmed.startsWith('cat ')) {
      const file = trimmed.slice(4).trim()
      const path = file.startsWith('/project') ? file : `/project/${file}`
      const content = vfs.readFile(path)
      this.addLog('command', trimmed)
      if (content !== undefined) {
        content.split('\n').forEach((l) => this.addLog('log', l))
      } else {
        this.addLog('error', `No existe el archivo: ${file}`)
      }
      return
    }

    if (trimmed.startsWith('node ')) {
      const file = trimmed.slice(5).trim()
      const path = file.startsWith('/project') ? file : `/project/${file}`
      await this.runFile(path)
      return
    }

    // Default: eval expression
    await this.executeScript(trimmed, 'eval')
  }
}

export const spatialRuntime = new SpatialRuntime()
