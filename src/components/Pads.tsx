import { Handle, HandleTarget } from '@react-three/handle'
import { Container, Text } from '@react-three/uikit'
import { ArchiveIcon, PlusIcon, Trash2Icon } from '@react-three/uikit-lucide'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh } from 'three'
import { useWorkspace } from '../store'
import { color, radius, type as typeScale } from '../theme'
import { px, PIXEL } from './Panel'
import { cleanText, UiRoot } from './Ui'
import { SpatialCapsule } from './SpatialCapsule'
import { useSpatialAffordance } from '../hooks/useSpatialAffordance'
import { SpatialAffordancePill } from './SpatialAffordancePill'
import { canStartDrag, GRAB_USERDATA } from '../interaction'

function ArchivePedestal({ count }: { count: number }) {
  const groupRef = useRef<Group>(null)
  const paperRef = useRef<Group>(null)
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)

  const archivePosition = useWorkspace((s) => s.archivePosition)
  const setArchivePosition = useWorkspace((s) => s.setArchivePosition)
  const toggleHidden = useWorkspace((s) => s.toggleHidden)
  const spawnSpotlight = useWorkspace((s) => s.spawnSpotlight)

  const [hovered, setHovered] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const affordance = useSpatialAffordance(groupRef)
  const isDragging = affordance.isDragging

  // Initialize position once on mount (imperative transform afterwards)
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(archivePosition[0], archivePosition[1], archivePosition[2])
    }
  }, [])

  // Floating gentle levitation of archival papers
  useFrame(() => {
    if (paperRef.current) {
      paperRef.current.position.y = 0.02 + Math.sin(Date.now() * 0.002) * 0.004
    }
  })

  // Long-press / hold detection (User rule: nada tiene que decir que es a menos de que lo mantenga apretado)
  const handlePointerEnter = () => {
    setHovered(true)
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    holdTimerRef.current = setTimeout(() => {
      setRevealed(true)
    }, 650)
  }

  const handlePointerLeave = () => {
    setHovered(false)
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    // Auto-hide details after short duration
    setTimeout(() => {
      if (!hovered) setRevealed(false)
    }, 2200)
  }

  return (
    <HandleTarget targetRef={groupRef}>
      <group
        ref={groupRef}
        rotation={[-0.42, 0.12, 0]}
        onPointerOver={handlePointerEnter}
        onPointerOut={handlePointerLeave}
      >
        {/* Contextual Actions Capsule (Cerrar, Minimizar, Mover) - Revealed on Long-Press / Hold */}
        {revealed && (
          <group position={[0, 0.12, 0.03]}>
            <SpatialCapsule
              targetRef={groupRef}
              title="BANDEJA ARCHIVAR"
              visible={revealed}
              onMinimize={() => setRevealed(false)}
              onClose={() => toggleHidden('archive')}
              onDismiss={() => setRevealed(false)}
            />
          </group>
        )}

        {/* 3D Frosted Glass & Metal Tray (Boceto 2: Bandeja de Archivar) */}
        <group position={[0, -0.065, -0.03]}>
          {/* Base plinth: Clean matte slate tray */}
          <mesh position={[0, -0.015, 0]}>
            <boxGeometry args={[0.30, 0.024, 0.20]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.2} />
          </mesh>

          {/* Pastel Mint rim frame */}
          <mesh position={[0, 0.002, 0]}>
            <boxGeometry args={[0.304, 0.005, 0.204]} />
            <meshStandardMaterial color={color.success} roughness={0.3} transparent opacity={0.65} />
          </mesh>

          {/* Stepped pastel mint document leaves */}
          <group ref={paperRef}>
            <mesh position={[0, 0.012, -0.01]} rotation={[-0.08, 0, 0]}>
              <boxGeometry args={[0.22, 0.005, 0.13]} />
              <meshStandardMaterial color="#a7f3d0" roughness={0.4} />
            </mesh>
            <mesh position={[-0.01, 0.020, -0.02]} rotation={[-0.12, 0.02, 0]}>
              <boxGeometry args={[0.20, 0.005, 0.12]} />
              <meshStandardMaterial color="#d1fae5" roughness={0.4} />
            </mesh>
          </group>
        </group>

        {/* Minimalist Tactile Surface Pill (Nothing shown unless held/long-pressed) */}
        <group position={[0, 0.032, 0.015]}>
          <UiRoot
            width={px(revealed ? 0.32 : 0.08)}
            height={px(revealed ? 0.09 : 0.05)}
            anchorY="center"
            pixelSize={PIXEL}
            alignItems="center"
            justifyContent="center"
          >
            <Container
              width={px(revealed ? 0.32 : 0.08)}
              height={px(revealed ? 0.09 : 0.05)}
              backgroundColor={
                isDragging
                  ? 'rgba(16, 185, 129, 0.35)'
                  : hovered
                  ? 'rgba(10, 20, 16, 0.95)'
                  : 'rgba(10, 20, 16, 0.75)'
              }
              borderColor={hovered || isDragging ? color.success : 'rgba(52, 211, 153, 0.35)'}
              borderTopWidth={1.5}
              borderBottomWidth={1}
              borderLeftWidth={1}
              borderRightWidth={1}
              borderBend={0.5}
              borderTopLeftRadius={radius.pill}
              borderTopRightRadius={radius.pill}
              borderBottomLeftRadius={radius.pill}
              borderBottomRightRadius={radius.pill}
              panelMaterialClass="glass"
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              gapColumn={revealed ? 10 : 0}
              cursor="grab"
              onClick={() => setRevealed(true)}
            >
              <Container
                width={28}
                height={28}
                borderTopLeftRadius={14}
                borderTopRightRadius={14}
                borderBottomLeftRadius={14}
                borderBottomRightRadius={14}
                backgroundColor="rgba(52, 211, 153, 0.18)"
                alignItems="center"
                justifyContent="center"
              >
                <ArchiveIcon width={14} color={color.success} />
              </Container>

              {/* Revealed subtitle and info ONLY when held / long-pressed */}
              {revealed && (
                <Container flexDirection="column" gapRow={2}>
                  <Text fontSize={typeScale.caption} fontWeight={700} color={color.success} letterSpacing={0.8}>
                    {cleanText('ARCHIVAR')}
                  </Text>
                  <Text fontSize={typeScale.micro} color={color.textDim}>
                    {cleanText(`${count} fuentes en el mapa`)}
                  </Text>
                </Container>
              )}
            </Container>
          </UiRoot>

          {/* Floating (+) Action Button (User request: tiene que aparecer un boton con el simbolo de mas cuando acerca el puntero o la mano) */}
          {affordance.visible && (
            <group position={[0, 0.08, 0.02]}>
              <UiRoot width={px(0.04)} height={px(0.04)} anchorY="center" pixelSize={PIXEL}>
                <Container
                  cursor="pointer"
                  width={34}
                  height={34}
                  borderTopLeftRadius={17}
                  borderTopRightRadius={17}
                  borderBottomLeftRadius={17}
                  borderBottomRightRadius={17}
                  backgroundColor="rgba(16, 185, 129, 0.92)"
                  borderColor="#6ee7b7"
                  borderTopWidth={1.5}
                  borderBottomWidth={1}
                  borderLeftWidth={1}
                  borderRightWidth={1}
                  alignItems="center"
                  justifyContent="center"
                  onClick={() => spawnSpotlight()}
                >
                  <PlusIcon width={16} color="#ffffff" />
                </Container>
              </UiRoot>
            </group>
          )}

          {/* Unified Movement Helper Pill (Revealed on 3s dwell hover, grip button squeeze, or proximity) */}
          <SpatialAffordancePill
            label="MOVER BANDEJA"
            visible={affordance.visible}
            isDragging={isDragging}
            dwellProgress={affordance.dwellProgress}
            accentColor={color.success}
            yOffset={-0.07}
            width={0.16}
          />

          {/* Two-Handed Generous Grab Handle for moving Archive Tray anywhere */}
          <Handle
            targetRef={groupRef}
            translate
            rotate={true}
            scale={true}
            multitouch={true}
            filter={canStartDrag}
            apply={(state, target) => {
              if (state.first) affordance.setIsDragging(true)
              target.position.copy(state.current.position)
              target.rotation.copy(state.current.rotation)
              target.scale.copy(state.current.scale)
              if (state.last) {
                affordance.setIsDragging(false)
                setArchivePosition([target.position.x, target.position.y, target.position.z])
              }
            }}
          >
            <mesh
              userData={{ [GRAB_USERDATA]: true }}
              onPointerEnter={affordance.onPointerEnter}
              onPointerLeave={affordance.onPointerLeave}
              onPointerDown={affordance.onPointerDown}
            >
              <planeGeometry args={[0.34, 0.16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </Handle>
        </group>
      </group>
    </HandleTarget>
  )
}

function TrashPedestal({ count }: { count: number }) {
  const groupRef = useRef<Group>(null)
  const ringRef = useRef<Mesh>(null)
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)

  const trashPosition = useWorkspace((s) => s.trashPosition)
  const setTrashPosition = useWorkspace((s) => s.setTrashPosition)
  const toggleHidden = useWorkspace((s) => s.toggleHidden)

  const [hovered, setHovered] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const affordance = useSpatialAffordance(groupRef)
  const isDragging = affordance.isDragging

  // Initialize position once on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(trashPosition[0], trashPosition[1], trashPosition[2])
    }
  }, [])

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.8
    }
  })

  // Long-press / hold detection
  const handlePointerEnter = () => {
    setHovered(true)
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    holdTimerRef.current = setTimeout(() => {
      setRevealed(true)
    }, 650)
  }

  const handlePointerLeave = () => {
    setHovered(false)
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    setTimeout(() => {
      if (!hovered) setRevealed(false)
    }, 2200)
  }

  return (
    <HandleTarget targetRef={groupRef}>
      <group
        ref={groupRef}
        rotation={[-0.42, -0.12, 0]}
        onPointerOver={handlePointerEnter}
        onPointerOut={handlePointerLeave}
      >
        {/* Contextual Actions Capsule (Cerrar, Minimizar, Mover) - Revealed on Long-Press / Hold */}
        {revealed && (
          <group position={[0, 0.12, 0.03]}>
            <SpatialCapsule
              targetRef={groupRef}
              title="TACHO BASURA"
              visible={revealed}
              onMinimize={() => setRevealed(false)}
              onClose={() => toggleHidden('archive')}
              onDismiss={() => setRevealed(false)}
            />
          </group>
        )}

        {/* 3D Dark Titanium & Coral Receptacle (Boceto 2: Tacho de Basura) */}
        <group position={[0, -0.07, -0.03]}>
          <mesh>
            <cylinderGeometry args={[0.095, 0.075, 0.13, 32, 1, true]} />
            <meshStandardMaterial color="#1e2433" roughness={0.6} metalness={0.15} side={2} />
          </mesh>

          {/* Floating Pastel Coral Rim Ring */}
          <mesh ref={ringRef} position={[0, 0.068, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.098, 0.004, 12, 36]} />
            <meshStandardMaterial color={color.danger} roughness={0.3} metalness={0.3} />
          </mesh>
        </group>

        {/* Minimalist Tactile Surface Pill (Nothing shown unless held/long-pressed) */}
        <group position={[0, 0.032, 0.015]}>
          <UiRoot
            width={px(revealed ? 0.32 : 0.08)}
            height={px(revealed ? 0.09 : 0.05)}
            anchorY="center"
            pixelSize={PIXEL}
            alignItems="center"
            justifyContent="center"
          >
            <Container
              width={px(revealed ? 0.32 : 0.08)}
              height={px(revealed ? 0.09 : 0.05)}
              backgroundColor={
                isDragging
                  ? 'rgba(244, 63, 94, 0.35)'
                  : hovered
                  ? 'rgba(24, 10, 14, 0.95)'
                  : 'rgba(24, 10, 14, 0.75)'
              }
              borderColor={hovered || isDragging ? color.danger : 'rgba(251, 113, 133, 0.35)'}
              borderTopWidth={1.5}
              borderBottomWidth={1}
              borderLeftWidth={1}
              borderRightWidth={1}
              borderBend={0.5}
              borderTopLeftRadius={radius.pill}
              borderTopRightRadius={radius.pill}
              borderBottomLeftRadius={radius.pill}
              borderBottomRightRadius={radius.pill}
              panelMaterialClass="glass"
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              gapColumn={revealed ? 10 : 0}
              cursor="grab"
              onClick={() => setRevealed(true)}
            >
              <Container
                width={28}
                height={28}
                borderTopLeftRadius={14}
                borderTopRightRadius={14}
                borderBottomLeftRadius={14}
                borderBottomRightRadius={14}
                backgroundColor="rgba(251, 113, 133, 0.18)"
                alignItems="center"
                justifyContent="center"
              >
                <Trash2Icon width={14} color={color.danger} />
              </Container>

              {/* Revealed subtitle and info ONLY when held / long-pressed */}
              {revealed && (
                <Container flexDirection="column" gapRow={2}>
                  <Text fontSize={typeScale.caption} fontWeight={700} color={color.danger} letterSpacing={0.8}>
                    {cleanText('BASURA')}
                  </Text>
                  <Text fontSize={typeScale.micro} color={color.textDim}>
                    {cleanText(`Descartar (${count} items)`)}
                  </Text>
                </Container>
              )}
            </Container>
          </UiRoot>

          {/* Unified Movement Helper Pill (Revealed on 3s dwell hover, grip button squeeze, or proximity) */}
          <SpatialAffordancePill
            label="MOVER BASURA"
            visible={affordance.visible}
            isDragging={isDragging}
            dwellProgress={affordance.dwellProgress}
            accentColor={color.danger}
            yOffset={-0.08}
            width={0.16}
          />

          {/* Two-Handed Generous Grab Handle for moving Trash Can anywhere */}
          <Handle
            targetRef={groupRef}
            translate
            rotate={true}
            scale={true}
            multitouch={true}
            filter={canStartDrag}
            apply={(state, target) => {
              if (state.first) affordance.setIsDragging(true)
              target.position.copy(state.current.position)
              target.rotation.copy(state.current.rotation)
              target.scale.copy(state.current.scale)
              if (state.last) {
                affordance.setIsDragging(false)
                setTrashPosition([target.position.x, target.position.y, target.position.z])
              }
            }}
          >
            <mesh
              userData={{ [GRAB_USERDATA]: true }}
              onPointerEnter={affordance.onPointerEnter}
              onPointerLeave={affordance.onPointerLeave}
              onPointerDown={affordance.onPointerDown}
            >
              <cylinderGeometry args={[0.14, 0.14, 0.18, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </Handle>
        </group>
      </group>
    </HandleTarget>
  )
}

export function Pads() {
  const sources = useWorkspace((s) => s.sources)

  return (
    <group>
      <ArchivePedestal count={sources.length} />
      <TrashPedestal count={sources.length} />
    </group>
  )
}
