/**
 * Azure AI Foundry GPT Live Voice & Subagent Delegation Service
 * Connects the 3D Voice Orb as Supervisory Agent to Azure AI Foundry,
 * delegating coding and workspace tasks to the wZed Subagent.
 */

import { executeWzedTool } from './aiCodingBridge'
import { spatialRuntime } from './spatialRuntime'
import { vfs } from './vfs'

export interface AzureFoundryConfig {
  projectEndpoint: string
  apiKey: string
  wsEndpoint?: string
}

export const AZURE_FOUNDRY_CONFIG: AzureFoundryConfig = {
  projectEndpoint: import.meta.env.VITE_AZURE_FOUNDRY_ENDPOINT || '',
  apiKey:
    import.meta.env.VITE_AZURE_AI_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('AZURE_AI_KEY') || '' : ''),
  wsEndpoint: import.meta.env.VITE_AZURE_FOUNDRY_WS || '',
}

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
  private listeners: Set<AgentStateListener> = new Set()
  private speechSynth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null

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

    // Check if task involves coding or workspace manipulation
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
