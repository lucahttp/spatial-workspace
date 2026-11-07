import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Handle, HandleTarget } from '@react-three/handle'
import { Container, Text } from '@react-three/uikit'
import { CheckIcon, MicIcon, SparklesIcon, XIcon } from '@react-three/uikit-lucide'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  LineSegments,
  Points,
  ShaderMaterial,
} from 'three'
import { MODE_FRAMES, resolvePreset } from 'thinking-orbs'
import { OrbState, useWorkspace } from '../store'
import { color } from '../theme'
import { px, PIXEL } from './Panel'
import { cleanText, UiRoot } from './Ui'
import { SpatialCapsule } from './SpatialCapsule'
import { wakeWordService } from '../services/wakeWordService'
import { useSpatialAffordance } from '../hooks/useSpatialAffordance'
import { SpatialAffordancePill } from './SpatialAffordancePill'

/**
 * Hand-tuned color accents for the 9 states of Thinking Orbs (Libraries.dev)
 */
export const ORB_COLORS: Record<OrbState, string> = {
  breathing: '#7dd3fc', // Soft Cyan
  listening: '#38bdf8', // Electric Sky
  searching: '#818cf8', // Indigo Pulse
  working: '#60a5fa',   // Blue Velocity
  solving: '#c084fc',   // Synth Violet
  connecting: '#34d399',// Jade Emerald
  weaving: '#f472b6',   // Coral Pink
  composing: '#fbbf24', // Warm Amber
  shaping: '#fb923c',   // Solar Orange
}

const MAX_DOTS = 700
const MAX_LINES = 200

// Shaders for luminous circular particle dots
const dotVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Delicate, hand-tuned particle scale matching Libraries.dev Thinking Orbs
    gl_PointSize = aSize * (18.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const dotFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Crisp anti-aliased circular particle with soft luminous edge
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.12, dist) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
    #include <colorspace_fragment>
  }
`

export function Orb({ radius = 0.065, level = 0 }: { radius?: number; level?: number }) {
  const state = useWorkspace((s) => s.orb)
  const pointsRef = useRef<Points>(null)
  const linesRef = useRef<LineSegments>(null)

  // Particle buffer arrays
  const positions = useMemo(() => new Float32Array(MAX_DOTS * 3), [])
  const colors = useMemo(() => new Float32Array(MAX_DOTS * 3), [])
  const sizes = useMemo(() => new Float32Array(MAX_DOTS), [])
  const alphas = useMemo(() => new Float32Array(MAX_DOTS), [])

  const linePositions = useMemo(() => new Float32Array(MAX_LINES * 2 * 3), [])
  const lineColors = useMemo(() => new Float32Array(MAX_LINES * 2 * 3), [])

  // Dot Geometry
  const dotGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage))
    geo.setAttribute('aColor', new BufferAttribute(colors, 3).setUsage(DynamicDrawUsage))
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1).setUsage(DynamicDrawUsage))
    geo.setAttribute('aAlpha', new BufferAttribute(alphas, 1).setUsage(DynamicDrawUsage))
    return geo
  }, [positions, colors, sizes, alphas])

  // Dot Shader Material
  const dotMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: dotVertexShader,
        fragmentShader: dotFragmentShader,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  // Connecting Lines Geometry & Material (for 'connecting' / web state)
  const lineGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(linePositions, 3).setUsage(DynamicDrawUsage))
    geo.setAttribute('color', new BufferAttribute(lineColors, 3).setUsage(DynamicDrawUsage))
    return geo
  }, [linePositions, lineColors])

  useEffect(() => {
    return () => {
      dotGeometry.dispose()
      dotMaterial.dispose()
      lineGeometry.dispose()
    }
  }, [dotGeometry, dotMaterial, lineGeometry])

  const stateColor = useMemo(() => new Color(ORB_COLORS[state] || '#38bdf8'), [state])

  // Animate particles using Libraries.dev mathematical models
  useFrame((_, delta) => {
    const now = performance.now() / 1000
    const preset = resolvePreset(state, 64)
    const mode = preset.mode
    const speed = preset.speed || 1.8
    const opts = preset.opts

    const frameFn = MODE_FRAMES[mode]
    if (!frameFn) return

    // Evaluate frame from thinking-orbs mathematical engine
    const frame = frameFn(64, now * speed, opts)
    const dots = frame.dots || []
    const count = Math.min(dots.length, MAX_DOTS)

    // Voice reactive pulse expansion
    const scale = (radius / 32) * (1.0 + level * 0.35)

    const posAttr = dotGeometry.getAttribute('position') as BufferAttribute
    const colAttr = dotGeometry.getAttribute('aColor') as BufferAttribute
    const sizeAttr = dotGeometry.getAttribute('aSize') as BufferAttribute
    const alphaAttr = dotGeometry.getAttribute('aAlpha') as BufferAttribute

    for (let i = 0; i < count; i++) {
      const d = dots[i]
      // Center around 0
      const px = (d.x - 32) * scale
      const py = -(d.y - 32) * scale
      const pz = (d.z || 0) * scale

      positions[i * 3] = px
      positions[i * 3 + 1] = py
      positions[i * 3 + 2] = pz

      // Interpolate dot color between state accent and pure white according to d.white
      const dotWhite = typeof d.white === 'number' ? d.white : 0.5
      const r = stateColor.r * (0.85 + dotWhite * 0.15)
      const g = stateColor.g * (0.85 + dotWhite * 0.15)
      const b = stateColor.b * (0.85 + dotWhite * 0.15)

      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      sizes[i] = Math.max(0.9, (d.r || 1.0) * 1.35 * (1.0 + level * 0.4))
      alphas[i] = Math.min(1.0, Math.max(0.2, (d.a || 0.8) * 0.95))
    }

    // Zero out remaining dots
    for (let i = count; i < MAX_DOTS; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      alphas[i] = 0
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
    dotGeometry.setDrawRange(0, count)

    // Handle connecting lines if present
    const lines = frame.lines || []
    const lineCount = Math.min(lines.length, MAX_LINES)
    if (lineCount > 0 && linesRef.current) {
      const linePosAttr = lineGeometry.getAttribute('position') as BufferAttribute
      const lineColAttr = lineGeometry.getAttribute('color') as BufferAttribute

      for (let i = 0; i < lineCount; i++) {
        const l = lines[i]
        if (!l) continue

        const idx = i * 6
        linePositions[idx] = (l.x1 - 32) * scale
        linePositions[idx + 1] = -(l.y1 - 32) * scale
        linePositions[idx + 2] = 0

        linePositions[idx + 3] = (l.x2 - 32) * scale
        linePositions[idx + 4] = -(l.y2 - 32) * scale
        linePositions[idx + 5] = 0

        const alpha = Math.min(1.0, (l.a || 0.6) * 0.9)
        lineColors[idx] = stateColor.r * alpha
        lineColors[idx + 1] = stateColor.g * alpha
        lineColors[idx + 2] = stateColor.b * alpha

        lineColors[idx + 3] = stateColor.r * alpha
        lineColors[idx + 4] = stateColor.g * alpha
        lineColors[idx + 5] = stateColor.b * alpha
      }

      linePosAttr.needsUpdate = true
      lineColAttr.needsUpdate = true
      lineGeometry.setDrawRange(0, lineCount * 2)
      linesRef.current.visible = true
    } else if (linesRef.current) {
      linesRef.current.visible = false
    }

    // Subtle gentle orbital drift of the entire point cloud
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.25
    }
  })

  return (
    <group>
      {/* 3D Volumetric Thinking Orb Particle Swarm (Libraries.dev engine) */}
      <points ref={pointsRef} geometry={dotGeometry} material={dotMaterial} />

      {/* Connecting Web Lines for 'connecting' state */}
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.7} blending={AdditiveBlending} />
      </lineSegments>

      {/* Subtle Luminous Core Glow */}
      <mesh>
        <sphereGeometry args={[radius * 0.22, 24, 24]} />
        <meshBasicMaterial color={ORB_COLORS[state]} transparent opacity={0.06 + level * 0.12} />
      </mesh>

      {/* Voice Ring / Sound-reactive Halo (Voice Glow / Voice Ring from Libraries.dev) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -radius * 0.55, 0]}>
        <ringGeometry args={[radius * 0.82, radius * (0.92 + level * 0.35), 64]} />
        <meshBasicMaterial
          color={ORB_COLORS[state]}
          transparent
          opacity={0.35 + level * 0.45}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Ambient Point Light Casting State-Reactive Radiance */}
      <pointLight color={ORB_COLORS[state]} intensity={1.2 + level * 1.5} distance={1.2} />
    </group>
  )
}

function TranscriptBubble({
  isListening,
  transcript,
  response,
  hovered,
  onDone,
  onCancel,
  onDismissResponse,
}: {
  isListening: boolean
  transcript: string
  response: string | null
  hovered: boolean
  onDone: () => void
  onCancel: () => void
  onDismissResponse: () => void
}) {
  if (!isListening && !response && !hovered) return null

  return (
    <UiRoot width={px(0.38)} height={px(0.12)} anchorY="bottom" pixelSize={PIXEL} alignItems="center" justifyContent="center">
      <Container
        flexDirection="column"
        width={px(0.38)}
        padding={8}
        gapRow={4}
        borderTopLeftRadius={12}
        borderTopRightRadius={12}
        borderBottomLeftRadius={12}
        borderBottomRightRadius={12}
        backgroundColor={
          isListening
            ? 'rgba(15, 23, 42, 0.92)'
            : response
            ? 'rgba(30, 27, 75, 0.92)'
            : 'rgba(15, 23, 42, 0.80)'
        }
        borderColor={
          isListening
            ? 'rgba(56, 189, 248, 0.75)'
            : response
            ? 'rgba(192, 132, 252, 0.75)'
            : 'rgba(255, 255, 255, 0.16)'
        }
        borderTopWidth={1.5}
        borderBottomWidth={1.5}
        borderLeftWidth={1.5}
        borderRightWidth={1.5}
      >
        {isListening ? (
          <>
            <Container flexDirection="row" alignItems="center" justifyContent="space-between" width="100%">
              <Container flexDirection="row" alignItems="center" gapColumn={6}>
                <Container
                  width={18}
                  height={18}
                  borderTopLeftRadius={9}
                  borderTopRightRadius={9}
                  borderBottomLeftRadius={9}
                  borderBottomRightRadius={9}
                  backgroundColor="rgba(56, 189, 248, 0.25)"
                  alignItems="center"
                  justifyContent="center"
                >
                  <MicIcon width={11} color="#38bdf8" />
                </Container>
                <Text fontSize={10} fontWeight={700} color="#38bdf8">
                  {cleanText('ESCUCHANDO ORBE · EN VIVO')}
                </Text>
              </Container>
              <Container flexDirection="row" gapColumn={4}>
                <Container
                  cursor="pointer"
                  paddingLeft={6}
                  paddingRight={6}
                  height={18}
                  borderTopLeftRadius={4}
                  borderTopRightRadius={4}
                  borderBottomLeftRadius={4}
                  borderBottomRightRadius={4}
                  backgroundColor="rgba(52, 211, 153, 0.25)"
                  alignItems="center"
                  justifyContent="center"
                  onClick={onDone}
                >
                  <CheckIcon width={10} color="#34d399" />
                  <Text fontSize={9} fontWeight={600} color="#34d399">
                    {cleanText('Listo')}
                  </Text>
                </Container>
                <Container
                  cursor="pointer"
                  paddingLeft={4}
                  paddingRight={4}
                  height={18}
                  borderTopLeftRadius={4}
                  borderTopRightRadius={4}
                  borderBottomLeftRadius={4}
                  borderBottomRightRadius={4}
                  backgroundColor="rgba(248, 113, 113, 0.20)"
                  alignItems="center"
                  justifyContent="center"
                  onClick={onCancel}
                >
                  <XIcon width={10} color="#f87171" />
                </Container>
              </Container>
            </Container>
            <Text fontSize={10} color="#f1f5f9" lineHeight={1.3} fontWeight={500}>
              {cleanText(transcript || 'Di tu comando o pregunta...')}
            </Text>
          </>
        ) : response ? (
          <>
            <Container flexDirection="row" alignItems="center" justifyContent="space-between" width="100%">
              <Container flexDirection="row" alignItems="center" gapColumn={5}>
                <SparklesIcon width={11} color="#c084fc" />
                <Text fontSize={10} fontWeight={700} color="#c084fc">
                  {cleanText('RESPUESTA AZURE FOUNDRY')}
                </Text>
              </Container>
              <Container
                cursor="pointer"
                padding={2}
                alignItems="center"
                justifyContent="center"
                onClick={onDismissResponse}
              >
                <XIcon width={11} color="rgba(255,255,255,0.4)" />
              </Container>
            </Container>
            <Text fontSize={10} color="#e2e8f0" lineHeight={1.3}>
              {cleanText(response)}
            </Text>
          </>
        ) : (
          <Container flexDirection="row" alignItems="center" gapColumn={6} justifyContent="center" width="100%">
            <MicIcon width={11} color={color.accent} />
            <Text fontSize={9} color={color.textDim} fontWeight={600}>
              {cleanText('Toca el Orbe para hablar o di "Hey Buddy"')}
            </Text>
          </Container>
        )}
      </Container>
    </UiRoot>
  )
}

export function MovableOrb({ level = 0 }: { level?: number }) {
  const orbPosition = useWorkspace((s) => s.orbPosition)
  const setOrbPosition = useWorkspace((s) => s.setOrbPosition)
  const orbState = useWorkspace((s) => s.orb)
  const voiceListening = useWorkspace((s) => s.voiceListening)
  const voiceTranscript = useWorkspace((s) => s.voiceTranscript)
  const voiceResponse = useWorkspace((s) => s.voiceResponse)
  const setVoiceResponse = useWorkspace((s) => s.setVoiceResponse)

  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const [capsuleVisible, setCapsuleVisible] = useState(false)
  
  // Unified 3-second dwell, grip trigger, and hand proximity affordance
  const affordance = useSpatialAffordance(groupRef)
  const isDragging = affordance.isDragging

  // Initialize transform once on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(orbPosition[0], orbPosition[1], orbPosition[2])
    }
  }, [])

  return (
    <HandleTarget targetRef={groupRef}>
      <group
        ref={groupRef}
        position={orbPosition}
        onPointerOver={() => {
          setHovered(true)
          setCapsuleVisible(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        {/* Floating Contextual Actions Capsule */}
        <group position={[0, 0.22, 0.02]}>
          <SpatialCapsule
            targetRef={groupRef}
            title={`ORBE · ${orbState.toUpperCase()}`}
            visible={capsuleVisible || hovered}
            onDismiss={() => setCapsuleVisible(false)}
          />
        </group>

        {/* Floating 3D Speech & Response Bubble Directly Above Orb */}
        <group position={[0, 0.14, 0]}>
          <TranscriptBubble
            isListening={voiceListening}
            transcript={voiceTranscript}
            response={voiceResponse}
            hovered={hovered}
            onDone={() => wakeWordService.stopCommandMode()}
            onCancel={() => {
              const { setVoiceListening, setOrb } = useWorkspace.getState()
              setVoiceListening(false)
              setOrb('breathing')
            }}
            onDismissResponse={() => setVoiceResponse(null)}
          />
        </group>

        {/* 3D Orb Particle Swarm */}
        <Orb level={level} />

        {/* Touch Target for the Orb: Tapping directly starts voice listening */}
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            wakeWordService.toggleOrbListening()
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer'
            setHovered(true)
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
            setHovered(false)
          }}
        >
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
        </mesh>

        {/* Unified Movement Helper Pill (Revealed on 3s dwell hover, grip button squeeze, or proximity) */}
        <SpatialAffordancePill
          label="MOVER ORBE"
          visible={affordance.visible}
          isDragging={isDragging}
          dwellProgress={affordance.dwellProgress}
          accentColor={ORB_COLORS[orbState] || color.accent}
          yOffset={-0.08}
          width={0.16}
        />

        {/* Generous Grab Handle for Orb with Two-Handed Manipulation */}
        <group position={[0, -0.065, 0]}>
          <Handle
            targetRef={groupRef}
            translate
            rotate={true}
            scale={true}
            multitouch={true}
            apply={(state, target) => {
              if (state.first) affordance.setIsDragging(true)
              target.position.copy(state.current.position)
              target.rotation.copy(state.current.rotation)
              target.scale.copy(state.current.scale)
              if (state.last) {
                affordance.setIsDragging(false)
                setOrbPosition([target.position.x, target.position.y, target.position.z])
              }
            }}
          >
            <mesh
              onPointerEnter={affordance.onPointerEnter}
              onPointerLeave={affordance.onPointerLeave}
              onPointerDown={affordance.onPointerDown}
            >
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </Handle>
        </group>
      </group>
    </HandleTarget>
  )
}
