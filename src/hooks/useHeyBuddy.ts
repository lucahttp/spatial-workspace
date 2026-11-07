/**
 * React Hook for HeyBuddy Wake Word Detection
 * Ported from mortimer-js (https://github.com/lucahttp/mortimer-js)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { HeyBuddy } from '../services/heybuddy/HeyBuddy'
import type { HeyBuddyOptions, HeyBuddyProcessedResult } from '../services/heybuddy/HeyBuddy'

export interface HeyBuddyState {
  isInitialized: boolean
  isListening: boolean
  isRecording: boolean
  isSpeaking: boolean
  speechProbability: number
  wakeWords: HeyBuddyProcessedResult['wakeWords']
  recording: string | null
  rawAudioSamples: Float32Array | null
  frameTimeEma: number
  permissionStatus: 'prompt' | 'granted' | 'denied'
  error: string | null
}

const initialState: HeyBuddyState = {
  isInitialized: false,
  isListening: false,
  isRecording: false,
  isSpeaking: false,
  speechProbability: 0,
  wakeWords: {},
  recording: null,
  rawAudioSamples: null,
  frameTimeEma: 0,
  permissionStatus: 'prompt',
  error: null,
}

/**
 * Converts floating-point audio samples to a Wave blob (16kHz 16-bit PCM).
 */
export function samplesToBlob(
  audioSamples: Float32Array,
  sampleRate = 16000,
  numChannels = 1
): Blob {
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  const floatTo16BitPCM = (
    output: DataView,
    offset: number,
    input: Float32Array
  ) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]))
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
  }

  const byteRate = sampleRate * numChannels * 2
  const blockAlign = numChannels * 2
  const wavHeaderSize = 44
  const dataLength = audioSamples.length * numChannels * 2
  const buffer = new ArrayBuffer(wavHeaderSize + dataLength)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  floatTo16BitPCM(view, wavHeaderSize, audioSamples)

  return new Blob([view], { type: 'audio/wav' })
}

/**
 * Custom hook for HeyBuddy wake word detection
 */
export function useHeyBuddy(
  options: HeyBuddyOptions = {},
  onRecordingComplete: ((audioSamples: Float32Array) => void) | null = null
) {
  const [state, setState] = useState<HeyBuddyState>(initialState)
  const heyBuddyRef = useRef<HeyBuddy | null>(null)
  const onRecordingCompleteRef = useRef(onRecordingComplete)

  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete
  }, [onRecordingComplete])

  const updateState = useCallback((updates: Partial<HeyBuddyState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      updateState({ permissionStatus: 'granted' })
      return true
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      updateState({ permissionStatus: 'denied', error: msg })
      return false
    }
  }, [updateState])

  const start = useCallback(async () => {
    if (heyBuddyRef.current) {
      try {
        await heyBuddyRef.current.start()
        updateState({ isInitialized: true, error: null })
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        updateState({ error: msg })
      }
    }
  }, [updateState])

  const stop = useCallback(() => {
    if (heyBuddyRef.current) {
      heyBuddyRef.current.stop()
      updateState({ isInitialized: false, isListening: false })
    }
  }, [updateState])

  const pause = useCallback(() => {
    if (heyBuddyRef.current) {
      heyBuddyRef.current.pause()
    }
  }, [])

  const resume = useCallback(() => {
    if (heyBuddyRef.current) {
      heyBuddyRef.current.resume()
    }
  }, [])

  useEffect(() => {
    const heyBuddy = new HeyBuddy(options)
    heyBuddyRef.current = heyBuddy

    heyBuddy.onProcessed((result) => {
      updateState({
        isListening: result.listening,
        isRecording: result.recording,
        isSpeaking: result.speech.active,
        speechProbability: result.speech.probability,
        wakeWords: result.wakeWords,
        frameTimeEma: heyBuddy.frameTimeEma,
      })
    })

    heyBuddy.onRecording((audioSamples) => {
      let url: string | null = null
      try {
        const blob = samplesToBlob(audioSamples)
        url = URL.createObjectURL(blob)
      } catch {
        // Blob URL optional for playback
      }

      updateState({
        recording: url,
        rawAudioSamples: audioSamples,
      })

      if (onRecordingCompleteRef.current) {
        onRecordingCompleteRef.current(audioSamples)
      }
    })

    return () => {
      heyBuddy.stop()
    }
  }, [options, updateState])

  return {
    ...state,
    start,
    stop,
    pause,
    resume,
    requestMicrophonePermission,
  }
}
