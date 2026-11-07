/**
 * Wake Word Detection Service (Inspired by Hey-Buddy)
 * https://github.com/painebenjamin/hey-buddy
 * 
 * Provides continuous hands-free wake word spotting in browser ("Hey Buddy", "Hello Buddy", "Oye Orbe", "Computer")
 * and coordinates with the 3D Thinking Orb and Azure AI Foundry.
 */

import { useWorkspace } from '../store'
import { azureFoundryVoice } from './azureFoundryVoice'
import { playClickSound, playSpotlightSound } from '../sound'
import { HeyBuddy } from './heybuddy/HeyBuddy'
import { samplesToBlob } from '../hooks/useHeyBuddy'

// Supported Wake Phrases
export const WAKE_WORDS = [
  'hey buddy',
  'hello buddy',
  'hi buddy',
  'okay buddy',
  'oye orbe',
  'orbe',
  'computer',
  'hey copilot',
  'spatial',
]

const HF_BASE_URL = 'https://huggingface.co/benjamin-paine/hey-buddy/resolve/main'

// Browser SpeechRecognition types
interface SpeechRecognitionResultItem {
  transcript: string
  confidence: number
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: SpeechRecognitionResultItem
      isFinal: boolean
    }
    length: number
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

type WakeWordCallback = (wakeWord: string) => void
type TranscriptCallback = (transcript: string, isFinal: boolean) => void

class WakeWordService {
  private isWakeWordActive = false
  private isCommandActive = false
  private recognition: SpeechRecognitionInstance | null = null
  private heyBuddy: HeyBuddy | null = null
  private wakeWordCallbacks: Set<WakeWordCallback> = new Set()
  private transcriptCallbacks: Set<TranscriptCallback> = new Set()
  private silenceTimer: number | null = null
  private accumulatedCommand = ''

  constructor() {
    this.initRecognition()
    this.initHeyBuddy()
  }

  private initHeyBuddy() {
    if (typeof window === 'undefined') return

    try {
      this.heyBuddy = new HeyBuddy({
        debug: false,
        modelPath: ['hey-buddy', 'buddy'].map((word) => `${HF_BASE_URL}/models/${word}.onnx`),
        vadModelPath: `${HF_BASE_URL}/pretrained/silero-vad.onnx`,
        spectrogramModelPath: `${HF_BASE_URL}/pretrained/mel-spectrogram.onnx`,
        embeddingModelPath: `${HF_BASE_URL}/pretrained/speech-embedding.onnx`,
      })

      this.heyBuddy.onDetected(['hey-buddy', 'buddy'], () => {
        console.log('[Hey-Buddy ONNX] Wake word detected!')
        this.onWakeWordDetected('hey buddy')
      })

      this.heyBuddy.onRecording((samples: Float32Array) => {
        console.log(`[Hey-Buddy ONNX] Audio batch captured: ${samples.length} samples`)
        const blob = samplesToBlob(samples)
        if (this.isCommandActive) {
          // If in command mode, notify audio blob readiness
          console.log('[Hey-Buddy ONNX] WAV blob generated:', blob.size, 'bytes')
        }
      })
    } catch (err) {
      console.warn('[Hey-Buddy ONNX] Fallback to SpeechRecognition (initialization deferred):', err)
    }
  }

  private initRecognition() {
    if (typeof window === 'undefined') return
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) {
      console.warn('SpeechRecognition API not available in this browser. Falling back to click/tap input.')
      return
    }

    try {
      this.recognition = new SpeechRec()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = 'es-ES' // Primary: Spanish; also matches phonetics

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1]
        if (!lastResult || !lastResult[0]) return

        const transcript = lastResult[0].transcript.toLowerCase().trim()
        const isFinal = lastResult.isFinal

        // 1. In Wake-Word Mode: check if user uttered any wake phrase
        if (this.isWakeWordActive && !this.isCommandActive) {
          for (const phrase of WAKE_WORDS) {
            if (transcript.includes(phrase)) {
              console.log(`[Hey-Buddy] Wake word detected: "${phrase}"`)
              this.onWakeWordDetected(phrase)
              return
            }
          }
        }

        // 2. In Active Command Mode: record user's command
        if (this.isCommandActive) {
          this.accumulatedCommand = transcript
          this.notifyTranscript(transcript, isFinal)

          // Reset silence timer: if user stops speaking for 1.8s, submit command automatically
          if (this.silenceTimer) window.clearTimeout(this.silenceTimer)
          this.silenceTimer = window.setTimeout(() => {
            if (this.isCommandActive && this.accumulatedCommand) {
              this.submitCommand(this.accumulatedCommand)
            }
          }, 1800)

          if (isFinal) {
            this.submitCommand(transcript)
          }
        }
      }

      this.recognition.onerror = (e) => {
        console.warn('[WakeWordService] Speech recognition event:', e)
      }

      this.recognition.onend = () => {
        // Auto-restart wake word listening if still active
        if (this.isWakeWordActive && !this.isCommandActive) {
          try {
            this.recognition?.start()
          } catch {
            // Already started or restarting
          }
        }
      }
    } catch (err) {
      console.warn('Failed to initialize SpeechRecognition:', err)
    }
  }

  private onWakeWordDetected(phrase: string) {
    playSpotlightSound()
    const { setOrb, setVoiceListening, setVoiceTranscript } = useWorkspace.getState()
    setOrb('listening')
    setVoiceListening(true)
    setVoiceTranscript(`¡Te escucho! (${phrase})`)

    this.wakeWordCallbacks.forEach((cb) => cb(phrase))
    this.startCommandMode()
  }

  private notifyTranscript(text: string, isFinal: boolean) {
    const { setVoiceTranscript } = useWorkspace.getState()
    setVoiceTranscript(text)
    this.transcriptCallbacks.forEach((cb) => cb(text, isFinal))
  }

  public async submitCommand(commandText: string) {
    if (this.silenceTimer) {
      window.clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }

    const { setVoiceListening, setVoiceTranscript, setVoiceResponse, setOrb } = useWorkspace.getState()
    this.isCommandActive = false
    setVoiceListening(false)

    const cleaned = commandText.trim()
    if (!cleaned) {
      setOrb('breathing')
      return
    }

    setVoiceTranscript(`Procesando: "${cleaned}"`)
    setOrb('working')

    try {
      const response = await azureFoundryVoice.handleVoiceCommand(cleaned)
      setVoiceResponse(response)
      setVoiceTranscript(`"${cleaned}"`)
      setTimeout(() => {
        setOrb('breathing')
      }, 3500)
    } catch (e) {
      console.error('Error handling voice command:', e)
      setOrb('breathing')
    }

    // Resume background wake word listening if enabled
    const { wakeWordEnabled } = useWorkspace.getState()
    this.heyBuddy?.resume()
    if (wakeWordEnabled) {
      this.startWakeWordListening()
    }
  }

  /**
   * Start hands-free continuous wake-word listening
   */
  public startWakeWordListening() {
    this.isWakeWordActive = true
    this.isCommandActive = false
    this.heyBuddy?.start().catch((err) => {
      console.warn('[HeyBuddy] Start error (falling back to SpeechRecognition):', err)
    })
    if (!this.recognition) return

    try {
      this.recognition.start()
    } catch {
      // Already running
    }
  }

  /**
   * Stop hands-free wake-word listening
   */
  public stopWakeWordListening() {
    this.isWakeWordActive = false
    this.isCommandActive = false
    this.heyBuddy?.stop()
    if (this.silenceTimer) {
      window.clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
    try {
      this.recognition?.stop()
    } catch {
      // Ignored
    }
  }

  /**
   * Directly triggers command listening (e.g. when user clicks/taps 3D Orb)
   */
  public startCommandMode() {
    playClickSound()
    this.heyBuddy?.pause()
    this.isCommandActive = true
    this.accumulatedCommand = ''
    const { setOrb, setVoiceListening, setVoiceTranscript, setVoiceResponse } = useWorkspace.getState()
    setOrb('listening')
    setVoiceListening(true)
    setVoiceResponse(null)
    setVoiceTranscript('Escuchando... Di tu instrucción o pregunta')

    if (!this.recognition) {
      // Fallback: prompt dialog for devices/browsers without live speech
      const promptText = window.prompt(
        'Habla o escribe tu comando para el Orbe Asistente (wZed + Azure Foundry):',
        'crea un modulo spatial para el preview y ejecuta index.js'
      )
      if (promptText) {
        this.submitCommand(promptText)
      } else {
        setVoiceListening(false)
        setOrb('breathing')
      }
      return
    }

    try {
      this.recognition.start()
    } catch {
      // Might already be active
    }
  }

  /**
   * Stop command mode and immediately submit accumulated text
   */
  public stopCommandMode() {
    if (this.accumulatedCommand) {
      this.submitCommand(this.accumulatedCommand)
    } else {
      const { setVoiceListening, setOrb } = useWorkspace.getState()
      setVoiceListening(false)
      setOrb('breathing')
      this.isCommandActive = false
    }
  }

  /**
   * Toggles command mode on/off (perfect for touching the 3D Orb)
   */
  public toggleOrbListening() {
    const { voiceListening } = useWorkspace.getState()
    if (voiceListening) {
      this.stopCommandMode()
    } else {
      this.startCommandMode()
    }
  }

  public onWakeWord(cb: WakeWordCallback): () => void {
    this.wakeWordCallbacks.add(cb)
    return () => this.wakeWordCallbacks.delete(cb)
  }

  public onTranscript(cb: TranscriptCallback): () => void {
    this.transcriptCallbacks.add(cb)
    return () => this.transcriptCallbacks.delete(cb)
  }
}

export const wakeWordService = new WakeWordService()
