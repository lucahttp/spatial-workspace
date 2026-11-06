import { ContactShadows, Environment, Lightformer, SoftShadows } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR, XROrigin } from '@react-three/xr'
import { Container, Text } from '@react-three/uikit'
import { MicIcon, SparklesIcon } from '@react-three/uikit-lucide'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Color, Fog, Group, Vector3 } from 'three'
import { useMicLevel } from '../hooks/useMicLevel'
import { glRef } from '../glRef'
import { Droplet, useWorkspace } from '../store'
import { color, layout, radius, type as typeScale } from '../theme'
import { Carousel } from './Carousel'
import { Dock } from './Dock'
import { IdeaGraph } from './IdeaGraph'
import { Orb } from './Orb'
import { Pads } from './Pads'
import { Panel } from './Panel'
import { Preview } from './Preview'
import { cleanText, FontProvider } from './Ui'

function GLBridge() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    gl.xr.enabled = true
    glRef.current = gl
    ;(window as unknown as { __scene: unknown }).__scene = scene
  }, [gl, scene])
  return null
}

function BlendMode() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const mode = useXR((s) => s.mode)
  const blend = useXR((s) => s.session?.environmentBlendMode)

  useEffect(() => {
    const isAR = mode === 'immersive-ar' || blend === 'alpha-blend' || blend === 'additive'
    if (isAR) {
      scene.background = null
      scene.fog = null
      gl.setClearColor(0x000000, 0)
      gl.setClearAlpha(0)
    } else {
      scene.background = new Color(color.bg)
      scene.fog = new Fog(color.bg, 2.0, 7.5)
      gl.setClearColor(new Color(color.bg), 1)
      gl.setClearAlpha(1)
    }
  }, [blend, mode, scene, gl])

  return null
}

function SpatialRig({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<Group>(null)
  const session = useXR((s) => s.session)
  const recenterTick = useWorkspace((s) => s.recenterTick)
  const gl = useThree((s) => s.gl)
  const hasAutoCentered = useRef(false)

  // Recenter workspace directly in front of the user's active viewpoint
  const recenter = useCallback(() => {
    if (!rootRef.current) return
    if (!session || !gl.xr.isPresenting) {
      rootRef.current.position.set(0, 0, 0)
      rootRef.current.rotation.set(0, 0, 0)
      return
    }

    const xrCamera = gl.xr.getCamera()
    const headPos = new Vector3()
    const headDir = new Vector3()

    xrCamera.getWorldPosition(headPos)
    xrCamera.getWorldDirection(headDir)

    // Forward heading in XZ plane: angle relative to default -Z
    const yaw = Math.atan2(headDir.x, -headDir.z)

    // In local-floor space, headPos.y is ~1.1m to 1.8m (standing/sitting).
    // In local reference space, headPos.y is ~0.0m.
    // Authored content has carousel centered at Y = 1.25m.
    // We adjust rig Y so authored Y=1.25m aligns directly with user's eye level:
    const eyeY = headPos.y > 0.3 ? headPos.y : 1.25
    const offsetY = headPos.y > 0.3 ? (eyeY - 1.25) : -1.25

    rootRef.current.position.set(headPos.x, offsetY, headPos.z)
    rootRef.current.rotation.set(0, yaw, 0)
    console.log(
      'SpatialRig: recentered at head [',
      headPos.x.toFixed(2),
      headPos.y.toFixed(2),
      headPos.z.toFixed(2),
      '] offset Y:',
      offsetY.toFixed(2),
      'yaw (deg):',
      ((yaw * 180) / Math.PI).toFixed(1)
    )
  }, [session, gl])

  // Recenter when explicitly requested via HUD or Dock
  useEffect(() => {
    if (recenterTick > 0) {
      recenter()
    }
  }, [recenterTick, recenter])

  // Reset auto-center flag when session ends
  useEffect(() => {
    if (!session) {
      hasAutoCentered.current = false
      if (rootRef.current) {
        rootRef.current.position.set(0, 0, 0)
        rootRef.current.rotation.set(0, 0, 0)
      }
    }
  }, [session])

  // Auto-center on first valid XR frame
  useFrame(() => {
    if (session && gl.xr.isPresenting && !hasAutoCentered.current) {
      recenter()
      hasAutoCentered.current = true
    }
  })

  return <group ref={rootRef}>{children}</group>
}

function VREnvironment() {
  const mode = useXR((s) => s.mode)
  const blend = useXR((s) => s.session?.environmentBlendMode)
  const isAR = mode === 'immersive-ar' || blend === 'alpha-blend' || blend === 'additive'

  if (isAR) return null

  return (
    <group position={[0, 0, 0]}>
      {/* Subtle Spatial Horizon Grid at floor level */}
      <gridHelper args={[30, 60, '#1e293b', '#0f172a']} position={[0, 0.01, 0]} />
      {/* Horizon Ambient Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[0, 16, 64]} />
        <meshBasicMaterial color="#0b1329" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  )
}

function AnimatedDroplet({ droplet, onComplete }: { droplet: Droplet; onComplete: () => void }) {
  const meshRef = useRef<Group>(null)
  const progress = useRef(0)

  useFrame((_, delta) => {
    progress.current += delta * 1.6
    if (progress.current >= 1) {
      onComplete()
      return
    }
    if (meshRef.current) {
      const t = progress.current
      const p0 = droplet.start
      const p2 = droplet.end
      const midY = Math.max(p0[1], p2[1]) + 0.30
      const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * ((p0[0] + p2[0]) / 2) + t * t * p2[0]
      const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * midY + t * t * p2[1]
      const z = (1 - t) * (1 - t) * p0[2] + 2 * (1 - t) * t * ((p0[2] + p2[2]) / 2) + t * t * p2[2]
      meshRef.current.position.set(x, y, z)
    }
  })

  return (
    <group ref={meshRef} position={droplet.start}>
      <mesh>
        <sphereGeometry args={[0.016, 16, 16]} />
        <meshBasicMaterial color={color.success} />
      </mesh>
      <pointLight color={color.success} distance={0.3} intensity={1.5} />
    </group>
  )
}

function EqualizerBar({ index, active }: { index: number; active: boolean }) {
  const [h, setH] = useState(6)
  useFrame(() => {
    if (!active) {
      setH(4)
      return
    }
    const val = 4 + Math.abs(Math.sin(Date.now() * 0.008 + index * 1.2)) * 14
    setH(Math.round(val))
  })

  return (
    <Container
      width={3}
      height={h}
      borderTopLeftRadius={1.5}
      borderTopRightRadius={1.5}
      borderBottomLeftRadius={1.5}
      borderBottomRightRadius={1.5}
      backgroundColor={active ? color.accent : 'rgba(255,255,255,0.2)'}
    />
  )
}

function TranscriptPanel() {
  const transcript = useWorkspace((s) => s.transcript)
  const orb = useWorkspace((s) => s.orb)
  const setTranscript = useWorkspace((s) => s.setTranscript)
  const setOrb = useWorkspace((s) => s.setOrb)
  const mic = useMicLevel()
  const listening = orb === 'listening'

  return (
    <>
      <Panel
        title="Transcripcion"
        subtitle="Voz & Razonamiento"
        accent={listening ? color.success : color.accent}
        width={layout.leftW}
        height={layout.leftH}
        position={[layout.leftX, layout.leftY, layout.leftZ]}
        rotation={[0, layout.leftRotY, 0]}
      >
        <Container flexDirection="column" width="100%" flexGrow={1} gapRow={6}>
          {/* Header Status Bar with Equalizer Bars and State Tag */}
          <Container
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
            paddingBottom={6}
            borderColor="rgba(255,255,255,0.08)"
            borderBottomWidth={1}
          >
            <Container flexDirection="row" alignItems="center" gapColumn={6}>
              <SparklesIcon width={12} color={color.accent} />
              <Text fontSize={typeScale.micro} fontWeight={700} color={color.accent} letterSpacing={0.5}>
                {cleanText(`ESTADO: ${orb.toUpperCase()}`)}
              </Text>
            </Container>

            {/* Simulated Live Equalizer Waveform */}
            <Container flexDirection="row" alignItems="center" gapColumn={3} height={18}>
              <EqualizerBar index={0} active={listening || mic.enabled} />
              <EqualizerBar index={1} active={listening || mic.enabled} />
              <EqualizerBar index={2} active={listening || mic.enabled} />
              <EqualizerBar index={3} active={listening || mic.enabled} />
              <EqualizerBar index={4} active={listening || mic.enabled} />
            </Container>
          </Container>

          {/* Transcript Lines */}
          <Container flexDirection="column" width="100%" flexGrow={1} gapRow={4} paddingTop={4}>
            {transcript.map((line, i) => (
              <Text
                key={i}
                fontSize={typeScale.caption}
                color={i === 0 ? color.textPrimary : color.textDim}
                lineHeight={1.35}
              >
                {cleanText(line)}
              </Text>
            ))}
          </Container>

          {/* Interactive Microphone Switch Pill */}
          <Container
            flexDirection="row"
            alignItems="center"
            gapColumn={8}
            paddingLeft={10}
            paddingRight={10}
            paddingTop={6}
            paddingBottom={6}
            borderTopLeftRadius={radius.button}
            borderTopRightRadius={radius.button}
            borderBottomLeftRadius={radius.button}
            borderBottomRightRadius={radius.button}
            backgroundColor={mic.enabled ? 'rgba(52, 211, 153, 0.18)' : 'rgba(255, 255, 255, 0.06)'}
            borderColor={mic.enabled ? color.success : color.borderSubtle}
            borderTopWidth={1}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            cursor="pointer"
            onClick={() => {
              if (mic.enabled) {
                mic.disable()
                setOrb('breathing')
                setTranscript(['Microfono apagado. Modo silencio activo.'])
              } else {
                mic.enable()
                setOrb('listening')
                setTranscript(['Microfono activo. Escuchando ordenes en tiempo real...'])
              }
            }}
          >
            <MicIcon width={12} color={mic.enabled ? color.success : color.textDim} />
            <Text fontSize={10} fontWeight={600} color={mic.enabled ? color.success : color.textDim}>
              {cleanText(
                mic.error
                  ? 'Permiso de microfono bloqueado'
                  : mic.enabled
                  ? 'Microfono activo (Click para pausar)'
                  : 'Activar microfono de voz'
              )}
            </Text>
          </Container>
        </Container>
      </Panel>

      {/* 3D Voice Orb floating directly atop Transcript panel (Boceto 1) */}
      <group position={[layout.leftX, layout.orbY, layout.orbZ]}>
        <Orb level={mic.enabled ? mic.level : listening ? 0.3 : 0} />
      </group>
    </>
  )
}

export function Workspace() {
  const hidden = useWorkspace((s) => s.hidden)
  const toggleHidden = useWorkspace((s) => s.toggleHidden)
  const showAll = useWorkspace((s) => s.showAll)
  const spawn = useWorkspace((s) => s.spawnSpotlight)
  const setStatus = useWorkspace((s) => s.setStatus)
  const recenter = useWorkspace((s) => s.recenter)
  const droplets = useWorkspace((s) => s.droplets)
  const removeDroplet = useWorkspace((s) => s.removeDroplet)
  const mode = useXR((s) => s.mode)
  const blend = useXR((s) => s.session?.environmentBlendMode)
  const isAR = mode === 'immersive-ar' || blend === 'alpha-blend' || blend === 'additive'

  const frameCount = useRef(0)
  useFrame((state) => {
    frameCount.current++
    if (frameCount.current === 1 || frameCount.current % 120 === 0) {
      console.log('>>> Workspace frame tick:', frameCount.current, 'isPresenting:', state.gl.xr.isPresenting, 'cam pos:', state.camera.position.toArray().map(n => Number(n.toFixed(2))))
    }
  })

  const onDock = (id: string) => {
    switch (id) {
      case 'all':
        showAll()
        setStatus('Todo restaurado')
        break
      case 'voice':
        toggleHidden('voice')
        break
      case 'carousel':
        toggleHidden('carousel')
        break
      case 'preview':
        toggleHidden('preview')
        break
      case 'graph':
        toggleHidden('graph')
        break
      case 'archive':
        toggleHidden('archive')
        break
      case 'spotlight':
        spawn()
        break
      case 'recenter':
        recenter()
        setStatus('Workspace recentrado')
        break
    }
  }

  return (
    <>
      <GLBridge />
      <BlendMode />
      <XROrigin />

      <FontProvider>
        {/* Soft Studio Environment for Glass Translucency */}
        <Environment resolution={128}>
          <Lightformer form="rect" intensity={2.5} color="#cfe8ff" position={[0, 3, 1]} scale={[6, 6, 1]} />
          <Lightformer form="rect" intensity={1.3} color="#ffd9a8" position={[-4, 1, -2]} scale={[4, 3, 1]} />
          <Lightformer form="rect" intensity={0.9} color="#8ab4ff" position={[4, 1, -2]} scale={[4, 3, 1]} />
        </Environment>

        <SoftShadows size={25} samples={16} />
        <ambientLight intensity={1.1} />
        <hemisphereLight args={['#dbeafe', '#0f172a', 1.0]} />
        <directionalLight position={[1.8, 3.2, 1.6]} intensity={1.4} castShadow />

        {/* VR Horizon Environment (Hidden in Passthrough AR) */}
        <VREnvironment />

        {/* Dynamic Spatial Rig: Centers content directly at the user's eye level in both local & local-floor */}
        <SpatialRig>
          {/* Spatial Modules */}
          {!hidden.voice && <TranscriptPanel />}
          {!hidden.carousel && <Carousel />}
          {!hidden.preview && <Preview />}
          {!hidden.graph && <IdeaGraph />}
          {!hidden.archive && <Pads />}

          {/* Animated Gooey droplets travelling from Archivar pad to IdeaGraph */}
          {droplets.map((d) => (
            <AnimatedDroplet key={d.id} droplet={d} onComplete={() => removeDroplet(d.id)} />
          ))}

          {/* Soft Ambient Contact Shadow (Desktop / VR only) */}
          {!isAR && (
            <ContactShadows position={[0, 0.05, -0.6]} opacity={0.38} scale={18} far={3.5} blur={2.2} frames={1} />
          )}

          <Dock onAction={onDock} />
        </SpatialRig>
      </FontProvider>
    </>
  )
}
