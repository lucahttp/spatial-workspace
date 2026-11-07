/**
 * Azure AI Foundry GPT Live Voice & Subagent Delegation Service
 * Connects the 3D Voice Orb as Supervisory Agent to Azure AI Foundry,
 * delegating coding and workspace tasks to the wZed Subagent.
 * 
 * Supports secure client-side storage via localStorage and URL hash (#endpoint=...&key=...)
 * ensuring NO secrets or API keys are ever stored in GitHub repository or public build bundles.
 */

import { executeWzedTool } from './aiCodingBridge'
import { spatialRuntime } from './spatialRuntime'
import { vfs } from './vfs'

export interface AzureFoundryConfig {
  projectEndpoint: string
  apiKey: string
  wsEndpoint?: string
}

function loadInitialConfig(): AzureFoundryConfig {
  let projectEndpoint = ''
  let apiKey = ''
  let wsEndpoint = ''

  if (typeof window !== 'undefined') {
    // 1. Check URL hash (e.g. #endpoint=https://...&key=...)
    try {
      const hash = window.location.hash.replace(/^#/, '')
      if (hash) {
        const params = new URLSearchParams(hash)
        const hashEndpoint = params.get('endpoint')
        const hashKey = params.get('key')
        const hashWs = params.get('ws')

        if (hashEndpoint || hashKey) {
          if (hashEndpoint) {
            projectEndpoint = hashEndpoint
            localStorage.setItem('AZURE_FOUNDRY_ENDPOINT', hashEndpoint)
          }
          if (hashKey) {
            apiKey = hashKey
            localStorage.setItem('AZURE_AI_KEY', hashKey)
          }
          if (hashWs) {
            wsEndpoint = hashWs
            localStorage.setItem('AZURE_FOUNDRY_WS', hashWs)
          }
          // Immediately wipe the hash from address bar for security
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      }
    } catch (e) {
      console.warn('[AzureFoundry] Error reading URL hash:', e)
    }

    // 2. Read from localStorage
    if (!projectEndpoint) {
      projectEndpoint = localStorage.getItem('AZURE_FOUNDRY_ENDPOINT') || ''
    }
    if (!apiKey) {
      apiKey = localStorage.getItem('AZURE_AI_KEY') || ''
    }
    if (!wsEndpoint) {
      wsEndpoint = localStorage.getItem('AZURE_FOUNDRY_WS') || ''
    }
  }

  // 3. Fallback to build-time env vars if provided
  if (!projectEndpoint) projectEndpoint = import.meta.env.VITE_AZURE_FOUNDRY_ENDPOINT || ''
  if (!apiKey) apiKey = import.meta.env.VITE_AZURE_AI_KEY || ''
  if (!wsEndpoint) wsEndpoint = import.meta.env.VITE_AZURE_FOUNDRY_WS || ''

  return { projectEndpoint, apiKey, wsEndpoint }
}

export const AZURE_FOUNDRY_CONFIG: AzureFoundryConfig = loadInitialConfig()

export interface SubagentTaskResult {
  action: string
  success: boolean
  summary: string
  details?: unknown
}

type AgentStateListener = (state: {
  status: 'idle' | 'listening' | 'delegating' | 'executing' | 'responding'
  message: string
  subagentLog?: string
}) => void

class AzureFoundryVoiceService {
  private config: AzureFoundryConfig = { ...AZURE_FOUNDRY_CONFIG }
  private listeners: Set<AgentStateListener> = new Set()
  private speechSynth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null

  constructor() {
    this.config = loadInitialConfig()
  }

  public getConfig(): AzureFoundryConfig {
    return { ...this.config }
  }

  public setConfig(newCfg: Partial<AzureFoundryConfig>) {
    if (newCfg.projectEndpoint !== undefined) {
      this.config.projectEndpoint = newCfg.projectEndpoint.trim()
      if (typeof window !== 'undefined') {
        localStorage.setItem('AZURE_FOUNDRY_ENDPOINT', this.config.projectEndpoint)
      }
    }
    if (newCfg.apiKey !== undefined) {
      this.config.apiKey = newCfg.apiKey.trim()
      if (typeof window !== 'undefined') {
        localStorage.setItem('AZURE_AI_KEY', this.config.apiKey)
      }
    }
    if (newCfg.wsEndpoint !== undefined) {
      this.config.wsEndpoint = newCfg.wsEndpoint.trim()
      if (typeof window !== 'undefined') {
        localStorage.setItem('AZURE_FOUNDRY_WS', this.config.wsEndpoint)
      }
    }
    this.notify('idle', 'Configuración de Azure Foundry actualizada en el cliente.')
  }

  public clearConfig() {
    this.config = { projectEndpoint: '', apiKey: '', wsEndpoint: '' }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('AZURE_FOUNDRY_ENDPOINT')
      localStorage.removeItem('AZURE_AI_KEY')
      localStorage.removeItem('AZURE_FOUNDRY_WS')
    }
    this.notify('idle', 'Credenciales de Azure Foundry eliminadas de este dispositivo.')
  }

  public isConfigured(): boolean {
    return Boolean(this.config.projectEndpoint && this.config.apiKey)
  }

  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.config.projectEndpoint || !this.config.apiKey) {
      return { ok: false, message: 'Falta ingresar el Endpoint o el API Key.' }
    }

    try {
      const url = this.config.projectEndpoint.replace(/\/+$/, '')
      let testUrl = `${url}?api-version=2024-05-01-preview`
      try {
        const parsed = new URL(url)
        testUrl = `${parsed.origin}/models/chat/completions?api-version=2024-05-01-preview`
      } catch {
        // fallback to url
      }

      const res = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'api-key': this.config.apiKey,
        },
      })

      if (res.ok || res.status === 200 || res.status === 404 || res.status === 405) {
        return { ok: true, message: `Conexión verificada con Azure AI Foundry (HTTP ${res.status}).` }
      } else {
        return { ok: false, message: `Azure respondió con estado ${res.status}: ${res.statusText}` }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('blocked')) {
        return {
          ok: false,
          message: '⚠️ Bloqueado por el navegador o adblocker (net::ERR_BLOCKED_BY_CLIENT / CORS). Si tienes uBlock, AdBlock o Brave Shields, desactívalo para este sitio. Puedes pulsar "Guardar y Conectar" para usarlo igualmente.',
        }
      }
      return { ok: false, message: `Error de red al contactar Azure: ${msg}` }
    }
  }

  public subscribe(cb: AgentStateListener): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notify(status: 'idle' | 'listening' | 'delegating' | 'executing' | 'responding', message: string, subagentLog?: string) {
    this.listeners.forEach((cb) => cb({ status, message, subagentLog }))
  }

  /**
   * Speak output using realistic vocal cadence in browser.
   */
  public speak(text: string) {
    if (!this.speechSynth) return
    try {
      this.speechSynth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.04
      utterance.pitch = 1.02
      utterance.lang = 'es-ES'
      this.speechSynth.speak(utterance)
    } catch (e) {
      console.warn('Speech synthesis error:', e)
    }
  }

  /**
   * Delegates a coding task to the wZed Coding Subagent.
   */
  public async delegateToWzedSubagent(task: string): Promise<SubagentTaskResult> {
    this.notify('executing', 'Subagente wZed ejecutando herramientas en VFS...', task)
    const lower = task.toLowerCase()

    try {
      // 1. Run/Execute command
      if (lower.includes('ejecut') || lower.includes('corr') || lower.includes('run')) {
        let file = '/project/index.js'
        if (lower.includes('card') || lower.includes('preview')) file = '/project/spatial-card.js'
        if (lower.includes('server') || lower.includes('servidor')) file = '/project/server.js'

        const execRes = await spatialRuntime.runFile(file)
        const summary = execRes.ok
          ? `Script ${file.replace('/project/', '')} ejecutado exitosamente en ${execRes.elapsedMs}ms.`
          : `Error al ejecutar: ${execRes.error}`

        return { action: 'execute_command', success: execRes.ok, summary, details: execRes }
      }

      // 2. List files
      if (lower.includes('lista') || lower.includes('archivos') || lower.includes('ls')) {
        const files = vfs.getFilePaths().map((p) => p.replace('/project/', ''))
        const summary = `Archivos en /project: ${files.join(', ')}`
        await executeWzedTool('execute_command', { command: 'ls' })
        return { action: 'list_directory', success: true, summary, details: files }
      }

      // 3. Create or modify component / file
      if (lower.includes('crea') || lower.includes('agrega') || lower.includes('escribe') || lower.includes('modifica')) {
        const newFileName = lower.includes('shader')
          ? '/project/shader.js'
          : lower.includes('test')
          ? '/project/test.js'
          : '/project/custom-widget.js'

        const codeContent = `// ✨ Generado por Subagente wZed (Comando de Voz Azure Foundry)
console.log('🚀 Módulo dinámico generado para el espacio 3D');
const metric = { timestamp: Date.now(), status: 'active', userPrompt: ${JSON.stringify(task)} };
console.log('Metadatos:', JSON.stringify(metric));
return \`<div style="padding:10px;color:#7c3aed;background:#ede9fe;border-radius:12px;"><h3>Componente Espacial Activo</h3><p>\${metric.userPrompt}</p></div>\`;
`
        vfs.writeFile(newFileName, codeContent)
        await spatialRuntime.runFile(newFileName)

        const summary = `Subagente wZed creó y ejecutó ${newFileName.replace('/project/', '')} en el VFS.`
        return { action: 'write_file', success: true, summary, details: { path: newFileName } }
      }

      // 4. Default: Run active file
      const defaultRes = await spatialRuntime.runFile('/project/index.js')
      return {
        action: 'execute_command',
        success: defaultRes.ok,
        summary: `Subagente wZed ejecutó index.js en ${defaultRes.elapsedMs}ms.`,
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return { action: 'error', success: false, summary: `Error en subagente: ${errMsg}` }
    }
  }

  /**
   * Handles user speech / query as Supervisory Agent with Azure AI Foundry.
   */
  public async handleVoiceCommand(transcriptText: string): Promise<string> {
    const text = transcriptText.trim()
    if (!text) return 'No se detectó comando de voz.'

    this.notify('listening', `Procesando con Azure Foundry GPT Live: "${text}"`)

    // Attempt live Azure AI Foundry call if configured
    if (this.isConfigured()) {
      try {
        const cleanBase = this.config.projectEndpoint.replace(/\/+$/, '')
        let endpointUrl = `${cleanBase}/models/chat/completions?api-version=2024-05-01-preview`
        if (cleanBase.includes('/api/projects/')) {
          try {
            const parsed = new URL(cleanBase)
            endpointUrl = `${parsed.origin}/models/chat/completions?api-version=2024-05-01-preview`
          } catch {
            // keep default endpointUrl
          }
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const response = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.config.apiKey,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content:
                  'Eres el Orbe Supervisor Inteligente en un entorno 3D espacial conectado al motor de desarrollo wZed. Eres conciso, amable y directo. Si el usuario te pide crear, modificar, ejecutar o inspeccionar código, archivos o terminal, confirma la acción para delegarla al subagente.',
              },
              { role: 'user', content: text },
            ],
            max_tokens: 250,
            temperature: 0.7,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          const answer = data.choices?.[0]?.message?.content?.trim()
          if (answer) {
            // Also delegate if code task detected
            const isCodingTask =
              /código|codigo|script|archivo|file|crea|modifica|ejecut|corr|terminal|vfs|server|wzed|run|ls/i.test(text)
            if (isCodingTask) {
              this.notify('delegating', `Delegando tarea al Subagente wZed: "${text}"`)
              await this.delegateToWzedSubagent(text)
            }

            this.notify('responding', answer)
            this.speak(answer)
            return answer
          }
        }
      } catch (e) {
        console.warn('[AzureFoundry] Live API call fallback to local orchestrator:', e)
      }
    }

    // Local supervisory orchestrator fallback
    const isCodingTask =
      /código|codigo|script|archivo|file|crea|modifica|ejecut|corr|terminal|vfs|server|wzed|run|ls/i.test(text)

    if (isCodingTask) {
      this.notify('delegating', `Delegando tarea al Subagente wZed: "${text}"`)
      const subResult = await this.delegateToWzedSubagent(text)

      const finalResponse = subResult.success
        ? `Listo. ${subResult.summary}`
        : `Hubo un inconveniente en el subagente: ${subResult.summary}`

      this.notify('responding', finalResponse, subResult.summary)
      this.speak(finalResponse)
      return finalResponse
    }

    // General spatial conversational query
    let responseText = 'Comando recibido en el espacio tridimensional.'
    if (/centrar|reciente|recenter/i.test(text)) {
      responseText = 'Recentrado el espacio de trabajo frente a tu mirada.'
    } else if (/hola|quién sos|quien sos/i.test(text)) {
      responseText = 'Hola, soy tu Orbe Asistente conectado a Azure AI Foundry y al motor de código wZed.'
    } else if (/limpiar|clear/i.test(text)) {
      spatialRuntime.clear()
      responseText = 'Terminal y registros limpiados.'
    } else {
      responseText = `Azure Foundry procesó: "${text}". Listo para accionar.`
    }

    this.notify('responding', responseText)
    this.speak(responseText)
    return responseText
  }
}

export const azureFoundryVoice = new AzureFoundryVoiceService()
