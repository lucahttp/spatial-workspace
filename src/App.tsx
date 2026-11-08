import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { createXRStore, noEvents, PointerEvents, useXR, XR } from '@react-three/xr'
import { useCallback, useEffect, useState, Suspense } from 'react'
import React from 'react'
import { BorderBeam } from 'border-beam'
import { ThinkingOrb } from 'thinking-orbs'
import { gsap } from 'gsap'
import { Workspace } from './components/Workspace'
import { GripRayPointers } from './components/SpatialXRInput'
import { glRef } from './glRef'
import { OrbState, useWorkspace } from './store'
import { initTransformersHandEngine } from './services/handTracking'
import { azureFoundryVoice } from './services/azureFoundryVoice'
import { wakeWordService } from './services/wakeWordService'

const store = createXRStore({
  foveation: 0,
  offerSession: true,
  layers: false,
  handTracking: true,
  anchors: false,
  meshDetection: false,
  planeDetection: false,
  emulate: false,
})

function SessionWatcher({ onChange }: { onChange: (inXR: boolean) => void }) {
  const session = useXR((s) => s.session)
  useEffect(() => onChange(!!session), [session, onChange])
  return null
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(p: { children: React.ReactNode }) {
    super(p)
    this.state = { error: null }
  }
  static getDerivedStateFromError(e: Error) {
    return { error: e }
  }
  render() {
    const e = this.state.error
    if (e)
      return (
        <div
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 999,
            color: '#fca5a5',
            background: 'rgba(127,29,29,.92)',
            border: '1px solid #f87171',
            padding: '12px 18px',
            borderRadius: '16px',
            maxWidth: '70vw',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          }}
        >
          {String(e?.stack || e)}
        </div>
      )
    return this.props.children
  }
}

const ORB_STATE_OPTIONS: { id: OrbState; label: string; color: string }[] = [
  { id: 'breathing', label: 'Breathing', color: '#7dd3fc' },
  { id: 'listening', label: 'Listening', color: '#38bdf8' },
  { id: 'searching', label: 'Searching', color: '#818cf8' },
  { id: 'working', label: 'Working', color: '#60a5fa' },
  { id: 'solving', label: 'Solving', color: '#c084fc' },
  { id: 'connecting', label: 'Connecting', color: '#34d399' },
  { id: 'weaving', label: 'Weaving', color: '#f472b6' },
  { id: 'composing', label: 'Composing', color: '#fbbf24' },
  { id: 'shaping', label: 'Shaping', color: '#fb923c' },
]

class ImmediateResizeObserver {
  callback: ResizeObserverCallback
  private nativeRO: ResizeObserver | null = null

  constructor(cb: ResizeObserverCallback) {
    this.callback = cb
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      try {
        this.nativeRO = new window.ResizeObserver(cb)
      } catch {}
    }
  }

  observe(target: Element) {
    const rect = target.getBoundingClientRect()
    const width = rect.width || (typeof window !== 'undefined' ? window.innerWidth : 1440)
    const height = rect.height || (typeof window !== 'undefined' ? window.innerHeight : 900)
    // Synchronously deliver the initial measurement so R3F initializes WebGL immediately
    try {
      this.callback(
        [
          {
            target,
            contentRect: { x: 0, y: 0, width, height, top: 0, bottom: height, left: 0, right: width } as DOMRectReadOnly,
            borderBoxSize: [{ inlineSize: width, blockSize: height }],
            contentBoxSize: [{ inlineSize: width, blockSize: height }],
            devicePixelContentBoxSize: [],
          } as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver,
      )
    } catch (e) {
      console.warn('ImmediateResizeObserver initial delivery warn:', e)
    }
    // Also delegate to native ResizeObserver for live window resizes
    if (this.nativeRO) {
      try {
        this.nativeRO.observe(target)
      } catch {}
    }
  }

  unobserve(target: Element) {
    this.nativeRO?.unobserve(target)
  }

  disconnect() {
    this.nativeRO?.disconnect()
  }
}

function CanvasDebug() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    console.log('>>> CanvasDebug mounted! gl:', !!gl, 'gl.xr:', !!gl?.xr, 'scene children:', scene.children.length)
    ;(window as any).__gl = gl
    ;(window as any).__scene = scene
  }, [gl, scene])
  return null
}

export function App() {
  const [error, setError] = useState<string | null>(null)
  const [inXR, setInXR] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customSummary, setCustomSummary] = useState('')
  const [customBadge, setCustomBadge] = useState('GOOGLE DOC')
  const [supportsAR, setSupportsAR] = useState<boolean | null>(null)
  const [showFoundryModal, setShowFoundryModal] = useState(false)
  const [foundryEndpoint, setFoundryEndpoint] = useState(() => azureFoundryVoice.getConfig().projectEndpoint)
  const [foundryKey, setFoundryKey] = useState(() => azureFoundryVoice.getConfig().apiKey)
  const [foundryStatusMsg, setFoundryStatusMsg] = useState('')
  const [showKeyPassword, setShowKeyPassword] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  const orb = useWorkspace((s) => s.orb)
  const setOrb = useWorkspace((s) => s.setOrb)
  const recenter = useWorkspace((s) => s.recenter)
  const spawnSpotlight = useWorkspace((s) => s.spawnSpotlight)
  const status = useWorkspace((s) => s.status)
  const setStatus = useWorkspace((s) => s.setStatus)
  const wakeWordEnabled = useWorkspace((s) => s.wakeWordEnabled)
  const setWakeWordEnabled = useWorkspace((s) => s.setWakeWordEnabled)

  useEffect(() => {
    if (wakeWordEnabled) {
      wakeWordService.startWakeWordListening()
    } else {
      wakeWordService.stopWakeWordListening()
    }
  }, [wakeWordEnabled])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (navigator.xr?.isSessionSupported) {
        navigator.xr.isSessionSupported('immersive-ar')
          .then((res) => setSupportsAR(res))
          .catch(() => setSupportsAR(false))
      } else {
        setSupportsAR(false)
      }
    }
  }, [])

  const enter = useCallback(async (requestedMode: 'immersive-ar' | 'immersive-vr') => {
    console.log('App: enter called for mode:', requestedMode)
    setError(null)

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError(
        'WebXR requiere HTTPS (contexto seguro). Si estas en Apple Vision Pro o red local, accede por https://lucahttp.github.io/spatial-workspace/'
      )
      return
    }

    if (typeof navigator === 'undefined' || !navigator.xr) {
      setError(
        'Tu navegador no expone WebXR. En Apple Vision Pro usa Safari (visionOS 2+). En PICO usa PICO Browser o Wolvic.'
      )
      return
    }

    let mode = requestedMode
    try {
      const isRequestedSupported = await navigator.xr.isSessionSupported(mode)
      if (!isRequestedSupported) {
        if (mode === 'immersive-ar') {
          const isVRSupported = await navigator.xr.isSessionSupported('immersive-vr')
          if (isVRSupported) {
            console.log(
              'App: immersive-ar no soportado por Apple Vision Pro / Safari (politica de camara). Cambiando a immersive-vr...'
            )
            mode = 'immersive-vr'
          } else {
            setError('Tu visor o navegador no admite sesiones WebXR AR ni VR.')
            return
          }
        } else {
          setError(`El modo '${mode}' no es compatible con este navegador o visor.`)
          return
        }
      }
    } catch (checkErr) {
      console.warn('App: error verificando soporte de sesion:', checkErr)
    }

    const gl = glRef.current || (window as any).__gl
    if (gl?.xr) {
      try {
        gl.xr.enabled = true
        store.setWebXRManager(gl.xr)
        gl.xr.setReferenceSpaceType('local-floor')
        console.log('App: gl.xr explicitly linked to store before enterXR')
      } catch (err) {
        console.warn('App: error setting up gl.xr before enter:', err)
      }
    }

    try {
      console.log('App: requesting session via store.enterXR for mode:', mode)
      await store.enterXR(mode)
      console.log('App: enterXR SUCCESS!')
    } catch (e: any) {
      const errStr = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
      console.error('App: enterXR failed:', e)

      // Only retry with local reference space if the error is specifically about local-floor / reference space
      const isRefSpaceErr = /reference\s*space|local-floor|floor/i.test(errStr)
      if (isRefSpaceErr && gl?.xr) {
        try {
          console.log('App: retrying with local reference space...')
          gl.xr.setReferenceSpaceType('local')
          await store.enterXR(mode)
          console.log('App: enterXR SUCCESS with local reference space!')
          return
        } catch (e2: any) {
          setError(e2?.message || String(e2))
          return
        }
      }

      // If AR fails on Apple Vision Pro with security or unsupported, fallback to VR gracefully
      if (mode === 'immersive-ar' && /security|supported|denied|cancel/i.test(errStr)) {
        try {
          console.log('App: immersive-ar no permitido; iniciando fallback a immersive-vr...')
          await store.enterXR('immersive-vr')
          console.log('App: enterXR SUCCESS con fallback immersive-vr!')
          return
        } catch (vrErr: any) {
          setError(
            `En Apple Vision Pro, Apple bloquea immersive-ar por privacidad de camaras. Intento VR fallo: ${vrErr?.message || errStr}`
          )
          return
        }
      }

      if (/not secure|SecurityError/i.test(errStr)) {
        setError(
          'Error de seguridad WebXR: Requiere HTTPS. En Safari de visionOS verifica que los Feature Flags de WebXR esten habilitados.'
        )
      } else if (/not supported|NotSupportedError/i.test(errStr)) {
        setError(
          `Modo '${mode}' no soportado. En Apple Vision Pro utiliza el boton de Realidad Virtual (immersive-vr).`
        )
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
  }, [])

  useEffect(() => {
    console.log('>>> App mounted! Setting window.__enterXR and window.__store')
    ;(window as any).__enterXR = enter
    ;(window as any).__store = store
    const params = new URLSearchParams(window.location.search)
    if (params.get('autoxr') === 'ar') {
      enter('immersive-ar')
    } else if (params.get('autoxr') === 'vr') {
      enter('immersive-vr')
    }
  }, [enter])

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customTitle.trim()) return
    spawnSpotlight({
      title: customTitle.trim(),
      summary: customSummary.trim() || 'Documento creado por el usuario para investigacion y analisis.',
      badge: customBadge,
      url: `https://docs.google.com/${customTitle.toLowerCase().replace(/\s+/g, '-')}`,
    })
    setCustomTitle('')
    setCustomSummary('')
    setShowModal(false)
  }

  const handleSaveFoundryConfig = () => {
    azureFoundryVoice.setConfig({
      projectEndpoint: foundryEndpoint,
      apiKey: foundryKey,
    })
    setFoundryStatusMsg('✓ Credenciales guardadas con éxito en el navegador.')
    setStatus('Azure Foundry configurado en este dispositivo.')
  }

  const handleTestFoundryConnection = async () => {
    setTestingConnection(true)
    setFoundryStatusMsg('Probando conexión con Azure AI Foundry...')
    azureFoundryVoice.setConfig({
      projectEndpoint: foundryEndpoint,
      apiKey: foundryKey,
    })
    const res = await azureFoundryVoice.testConnection()
    setFoundryStatusMsg(res.message)
    setTestingConnection(false)
  }

  const handleClearFoundryConfig = () => {
    azureFoundryVoice.clearConfig()
    setFoundryEndpoint('')
    setFoundryKey('')
    setFoundryStatusMsg('Credenciales eliminadas de este dispositivo.')
    setStatus('Azure Foundry desconectado.')
  }

  useEffect(() => {
    if (showModal || showFoundryModal) {
      gsap.fromTo(
        '.modal-card',
        { scale: 0.86, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.5)' }
      )
    }
  }, [showModal, showFoundryModal])

  return (
    <ErrorBoundary>
      <>
        {/* UNIFIED VISIONOS / PICO OS 5 TOP HUD */}
        <header className="top-hud">
          <BorderBeam size="sm" colorVariant="ocean" borderRadius={999} duration={12}>
            <div className="hud-pill">
              {/* Brand Logo with Live Thinking Orb (Libraries.dev engine) & Status */}
              <div className="brand-group">
                <div className="hud-orb-wrapper">
                  <ThinkingOrb state={orb} size={20} theme="dark" />
                </div>
                <span className="brand-text">PICO OS Spatial Workspace</span>
                <span className="divider">·</span>
                <span className="status-text">{status}</span>
              </div>

              {/* Exactly TWO Action Buttons in Top Header (User request: tiene que haber dos botones. uno para entrar al modo vr/mr otro para los settings esos) */}
              <div className="actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* 1. VR / MR Action Button */}
                {inXR ? (
                  <button
                    className="btn primary xr-exit"
                    onClick={() => {
                      const session = store.getState().session
                      if (session) session.end()
                    }}
                    style={{ background: 'rgba(244, 63, 94, 0.35)', borderColor: '#fb7185', color: '#ffffff' }}
                    title="Salir de la sesión inmersiva WebXR"
                  >
                    🥽 Salir de XR ✕
                  </button>
                ) : (
                  <button
                    className="btn primary xr-ar"
                    onClick={() => enter(supportsAR ? 'immersive-ar' : 'immersive-vr')}
                    title="Entrar a Modo Inmersivo VR/MR (Pico 4 Ultra, Pico Neo, Apple Vision Pro)"
                  >
                    🥽 {supportsAR ? 'Passthrough AR (Pico 4 Ultra)' : 'VR (Pico Neo / WebXR)'}
                  </button>
                )}

                {/* 2. System Settings & Tools Button ("los settings esos") */}
                <button
                  className="btn icon-btn"
                  onClick={() => {
                    setFoundryEndpoint(azureFoundryVoice.getConfig().projectEndpoint)
                    setFoundryKey(azureFoundryVoice.getConfig().apiKey)
                    setShowFoundryModal(true)
                  }}
                  style={{
                    background: azureFoundryVoice.isConfigured() ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    borderColor: azureFoundryVoice.isConfigured() ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)',
                    color: azureFoundryVoice.isConfigured() ? '#38bdf8' : '#e2e8f0',
                  }}
                  title="Configuración de Sistema, Azure Foundry, Wake Word, Hand ML y Herramientas"
                >
                  ⚙️ Configuración
                </button>
              </div>
            </div>
          </BorderBeam>

          {error && (
            <div
              className="error"
              onClick={() => setError(null)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              title="Haz clic para descartar este mensaje"
            >
              <span>{error}</span>
              <span style={{ fontWeight: 700, marginLeft: 4 }}>✕</span>
            </div>
          )}
        </header>

        {/* SPOTLIGHT MODAL (Boceto 2: 'Spotlight nuevo serch docs google') */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <BorderBeam size="md" colorVariant="forest" borderRadius={24} duration={8}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title-row">
                    <span className="modal-dot"></span>
                    <h3>+ Spotlight Nuevo</h3>
                  </div>
                  <button className="close-btn" onClick={() => setShowModal(false)}>
                    ✕
                  </button>
                </div>
                <p className="modal-subtitle">
                  Crea una nueva fuente documental para incorporarla al carrusel y tejer el mapa de ideas.
                </p>
                <form onSubmit={handleCreateCard}>
                  <div className="form-group">
                    <label>Tipo de fuente</label>
                    <select value={customBadge} onChange={(e) => setCustomBadge(e.target.value)}>
                      <option value="GOOGLE DOC">Google Doc</option>
                      <option value="GOOGLE SEARCH">Google Search</option>
                      <option value="RESEARCH PAPER">Research Paper XR</option>
                      <option value="WOLVIC NOTE">Nota Wolvic</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Titulo</label>
                    <input
                      type="text"
                      placeholder="Ej: Analisis de Arquitectura Espacial"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Resumen / Contenido</label>
                    <textarea
                      rows={3}
                      placeholder="Descripcion del documento para previsualizacion..."
                      value={customSummary}
                      onChange={(e) => setCustomSummary(e.target.value)}
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn" onClick={() => setShowModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn primary">
                      Agregar al Carrusel
                    </button>
                  </div>
                </form>
              </div>
            </BorderBeam>
          </div>
        )}

        {/* UNIFIED VISIONOS SYSTEM SETTINGS & TOOLS MODAL ("los settings esos") */}
        {showFoundryModal && (
          <div className="modal-overlay" onClick={() => setShowFoundryModal(false)}>
            <BorderBeam size="md" colorVariant="ocean" borderRadius={24} duration={8}>
              <div className="modal-card" style={{ maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title-row">
                    <span className="modal-dot" style={{ background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }}></span>
                    <h3>Configuración de Sistema & Herramientas</h3>
                  </div>
                  <button className="close-btn" onClick={() => setShowFoundryModal(false)}>
                    ✕
                  </button>
                </div>
                <p className="modal-subtitle">
                  Gestiona Azure AI Foundry, control por voz manos libres (Hey-Buddy), tracking de manos y orientación del espacio.
                </p>

                {/* SECTION 1: AZURE AI FOUNDRY */}
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>⚡</span>
                    <strong style={{ fontSize: 12, color: '#38bdf8' }}>Azure AI Foundry (GPT Live Voice)</strong>
                  </div>
                  
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSaveFoundryConfig()
                      setShowFoundryModal(false)
                    }}
                  >
                    <div className="form-group">
                      <label>Project Endpoint URL</label>
                      <input
                        type="text"
                        placeholder="https://<recurso>.services.ai.azure.com/api/projects/<proyecto>"
                        value={foundryEndpoint}
                        onChange={(e) => setFoundryEndpoint(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label>API Key</label>
                        <button
                          type="button"
                          onClick={() => setShowKeyPassword(!showKeyPassword)}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}
                        >
                          {showKeyPassword ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                      <input
                        type={showKeyPassword ? 'text' : 'password'}
                        placeholder="Pega tu API Key de Azure Foundry aquí"
                        value={foundryKey}
                        onChange={(e) => setFoundryKey(e.target.value)}
                      />
                    </div>

                    {foundryStatusMsg && (
                      <div
                        style={{
                          fontSize: 11,
                          padding: '8px 12px',
                          borderRadius: 10,
                          marginBottom: 10,
                          background: foundryStatusMsg.includes('✓') || foundryStatusMsg.includes('200')
                            ? 'rgba(52, 211, 153, 0.15)'
                            : 'rgba(56, 189, 248, 0.15)',
                          color: foundryStatusMsg.includes('✓') || foundryStatusMsg.includes('200') ? '#34d399' : '#38bdf8',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        {foundryStatusMsg}
                      </div>
                    )}

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={handleClearFoundryConfig}
                        style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)', padding: '6px 12px', fontSize: 11 }}
                        title="Eliminar credenciales almacenadas"
                      >
                        Borrar Claves
                      </button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={handleTestFoundryConnection}
                          disabled={testingConnection}
                          style={{ padding: '6px 12px', fontSize: 11 }}
                        >
                          {testingConnection ? 'Probando...' : 'Probar Conexión'}
                        </button>
                        <button
                          type="submit"
                          className="btn primary"
                          style={{ padding: '6px 14px', fontSize: 11 }}
                        >
                          Guardar y Conectar
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* SECTION 2: VOZ, WAKE WORD & ORBE */}
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>🎙️</span>
                    <strong style={{ fontSize: 12, color: '#c084fc' }}>Voz Manos Libres & Orbe</strong>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <button
                      type="button"
                      className={`btn ${wakeWordEnabled ? 'active' : ''}`}
                      onClick={() => {
                        const next = !wakeWordEnabled
                        setWakeWordEnabled(next)
                        setStatus(next ? 'Wake Word activo: Di "Hey Buddy" o "Oye Orbe"' : 'Wake Word desactivado')
                      }}
                      style={{ fontSize: 11, padding: '7px 12px' }}
                    >
                      {wakeWordEnabled ? '👂 Wake Word: ON' : '🔇 Wake Word: OFF'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={async () => {
                        const prompt = window.prompt(
                          'Comando para Orbe de Voz (Azure Foundry + wZed Subagente):',
                          'crea un componente espacial y corre index.js'
                        )
                        if (prompt) {
                          await azureFoundryVoice.handleVoiceCommand(prompt)
                        }
                      }}
                      style={{ fontSize: 11, padding: '7px 12px' }}
                    >
                      🎙️ Hablar ahora
                    </button>
                    <select
                      className="orb-select"
                      value={orb}
                      onChange={(e) => setOrb(e.target.value as OrbState)}
                      style={{ fontSize: 11, padding: '6px 10px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
                    >
                      {ORB_STATE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          Estado: {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SECTION 3: HERRAMIENTAS ESPACIALES & HAND ML */}
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>🖐️</span>
                    <strong style={{ fontSize: 12, color: '#34d399' }}>Herramientas Espaciales</strong>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={async () => {
                        setStatus('Iniciando Transformers.js ONNX Hand Engine...')
                        const ok = await initTransformersHandEngine()
                        if (ok) setStatus('Transformers.js ONNX Hand Engine: Activo!')
                      }}
                      style={{ fontSize: 11, padding: '7px 12px' }}
                    >
                      🖐️ Hand ML (ONNX)
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        recenter()
                        setStatus('Espacio recentrado')
                      }}
                      style={{ fontSize: 11, padding: '7px 12px' }}
                    >
                      🎯 Recentrar Vista
                    </button>
                    <button
                      type="button"
                      className="btn spotlight-btn"
                      onClick={() => {
                        setShowFoundryModal(false)
                        setShowModal(true)
                      }}
                      style={{ fontSize: 11, padding: '7px 14px' }}
                    >
                      + Spotlight (Búsqueda)
                    </button>
                  </div>
                </div>
              </div>
            </BorderBeam>
          </div>
        )}

        {/* 3D SPATIAL SCENE (Optimized panoramic depth) */}
        <Canvas
          resize={{ polyfill: ImmediateResizeObserver as any }}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          events={noEvents}
          shadows="soft"
          dpr={[1, 2]}
          camera={{ position: [0, 1.28, 0.18], fov: 60, near: 0.05, far: 50 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            console.log('>>> Canvas onCreated! gl.xr:', !!gl?.xr)
            ;(window as any).__gl = gl
            glRef.current = gl
            try {
              store.setWebXRManager(gl.xr)
              console.log('>>> store.setWebXRManager explicitly connected in onCreated!')
            } catch (err) {
              console.error('>>> store.setWebXRManager error in onCreated:', err)
            }
          }}
        >
          <CanvasDebug />
          <PointerEvents batchEvents={false} />
          {!inXR && (
            <OrbitControls
              target={[0, 1.15, -1.2]}
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              minDistance={0.35}
              maxDistance={3.5}
            />
          )}
          <XR store={store}>
            <SessionWatcher onChange={setInXR} />
            <Suspense fallback={null}>
              <Workspace />
            </Suspense>
            <GripRayPointers />
          </XR>
        </Canvas>
      </>
    </ErrorBoundary>
  )
}
