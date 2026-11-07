import { Line, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Handle, HandleTarget } from '@react-three/handle'
import { Container } from '@react-three/uikit'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Mesh } from 'three'
import { useWorkspace } from '../store'
import { color, radius } from '../theme'
import { px, PIXEL } from './Panel'
import { cleanText, DREI_FONT, UiRoot } from './Ui'
import { SpatialCapsule } from './SpatialCapsule'

export function IdeaGraph() {
  const sources = useWorkspace((s) => s.sources)
  const select = useWorkspace((s) => s.select)
  const graphPosition = useWorkspace((s) => s.graphPosition)
  const graphRotation = useWorkspace((s) => s.graphRotation)
  const setGraphTransform = useWorkspace((s) => s.setGraphTransform)

  const groupRef = useRef<Group>(null)
  const crystalRef = useRef<Mesh>(null)
  const haloRef = useRef<Mesh>(null)

  const [hovered, setHovered] = useState(false)
  const [capsuleVisible, setCapsuleVisible] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Initialize transform once on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(graphPosition[0], graphPosition[1], graphPosition[2])
      groupRef.current.rotation.set(graphRotation[0], graphRotation[1], graphRotation[2])
    }
  }, [])

  useFrame((_, delta) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y += delta * 0.6
      crystalRef.current.rotation.x += delta * 0.3
    }
    if (haloRef.current) {
      haloRef.current.rotation.z -= delta * 0.4
    }
  })

  const satellites = useMemo(
    () =>
      sources.map((s, i) => {
        const count = Math.max(1, sources.length)
        const angle = (i / count) * Math.PI * 2 + 0.4
        const dist = 0.18 + (i % 2) * 0.04
        return {
          source: s,
          position: [
            Math.cos(angle) * dist,
            Math.sin(angle) * (dist * 0.75),
            Math.sin(angle * 2) * 0.06,
          ] as [number, number, number],
        }
      }),
    [sources],
  )

  return (
    <HandleTarget targetRef={groupRef}>
      <group
        ref={groupRef}
        position={graphPosition}
        rotation={graphRotation}
        onPointerOver={() => {
          setHovered(true)
          setCapsuleVisible(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        {/* Floating Contextual Actions Capsule (Mover, Orientar, etc.) */}
        <group position={[0, 0.12, 0.03]}>
          <SpatialCapsule
            targetRef={groupRef}
            title="MAPA DE IDEAS"
            visible={capsuleVisible || hovered}
            onDismiss={() => setCapsuleVisible(false)}
          />
        </group>

        {/* Central Idea Crystal (Boceto 2: Nodo Central 'Idea') */}
        <group>
          {/* Crystal Core */}
          <mesh ref={crystalRef}>
            <octahedronGeometry args={[0.026, 0]} />
            <meshStandardMaterial
              color={color.idea}
              emissive={color.idea}
              emissiveIntensity={1.2}
              roughness={0.15}
              metalness={0.8}
            />
          </mesh>

          {/* Ambient Warm Glow Point Light */}
          <pointLight color={color.idea} distance={0.5} intensity={1.8} decay={2} />

          {/* Rotating Orbital Halo Ring */}
          <mesh ref={haloRef} rotation-x={Math.PI / 3}>
            <torusGeometry args={[0.045, 0.0016, 8, 36]} />
            <meshBasicMaterial color={color.idea} transparent opacity={0.6} toneMapped={false} />
          </mesh>

          {/* Floating Title Tag */}
          <Text
            position={[0, 0.065, 0]}
            font={DREI_FONT}
            fontSize={0.019}
            color={color.idea}
            anchorX="center"
            outlineWidth={0.002}
            outlineColor="#000000"
            outlineOpacity={0.8}
          >
            {cleanText(`IDEA Y FUENTES (${sources.length})`)}
          </Text>
        </group>

        {/* Satellite Source Nodes (Boceto 2: Fuentes Conectadas) */}
        {satellites.map(({ source, position }) => (
          <group
            key={source.id}
            position={position}
            onClick={() => select(source.id)}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = 'default')}
          >
            {/* Satellite Pearl Mesh */}
            <mesh>
              <sphereGeometry args={[0.012, 16, 16]} />
              <meshStandardMaterial
                color={color.accent}
                emissive={color.accent}
                emissiveIntensity={0.9}
                roughness={0.2}
                metalness={0.5}
              />
            </mesh>

            {/* Glowing Constellation Link Line to Central Idea */}
            <Line
              points={[
                [0, 0, 0],
                [-position[0], -position[1], -position[2]],
              ]}
              color={color.accent}
              lineWidth={1.5}
              transparent
              opacity={0.65}
              raycast={() => null}
            />

            {/* Mini Source Label Pill */}
            <Text
              position={[0, 0.022, 0]}
              font={DREI_FONT}
              fontSize={0.013}
              color={color.textPrimary}
              anchorX="center"
              outlineWidth={0.002}
              outlineColor="#000000"
              outlineOpacity={0.8}
            >
              {cleanText(source.title.slice(0, 18))}
            </Text>
          </group>
        ))}

        {/* Empty State Helpful Hint */}
        {sources.length === 0 && (
          <Text
            position={[0, -0.055, 0]}
            font={DREI_FONT}
            fontSize={0.014}
            color={color.textDim}
            anchorX="center"
            outlineWidth={0.0015}
            outlineColor="#000000"
            outlineOpacity={0.8}
          >
            {cleanText('Arrastra una tarjeta a Archivar para tejer el mapa')}
          </Text>
        )}

        {/* Tactile Grab Pill Underneath MindMap */}
        <group position={[0, -0.08, 0]}>
          <UiRoot width={px(0.22)} height={px(0.045)} anchorY="center" pixelSize={PIXEL} alignItems="center" justifyContent="center">
            <Container
              cursor="grab"
              width={px(0.22)}
              height={px(0.045)}
              borderTopLeftRadius={radius.pill}
              borderTopRightRadius={radius.pill}
              borderBottomLeftRadius={radius.pill}
              borderBottomRightRadius={radius.pill}
              backgroundColor={isDragging ? 'rgba(251, 191, 36, 0.35)' : hovered ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)'}
              borderColor={color.idea}
              borderTopWidth={1}
              borderBottomWidth={1}
              borderLeftWidth={1}
              borderRightWidth={1}
              alignItems="center"
              justifyContent="center"
            >
              <Container
                width={isDragging ? 58 : 36}
                height={4.5}
                borderTopLeftRadius={2.5}
                borderTopRightRadius={2.5}
                borderBottomLeftRadius={2.5}
                borderBottomRightRadius={2.5}
                backgroundColor={color.idea}
              />
            </Container>
          </UiRoot>

          {/* Generous Grab Handle for MindMap */}
          <Handle
            targetRef={groupRef}
            translate
            rotate={true}
            scale={false}
            multitouch={true}
            apply={(state, target) => {
              if (state.first) setIsDragging(true)
              target.position.copy(state.current.position)
              target.rotation.copy(state.current.rotation)
              if (state.last) {
                setIsDragging(false)
                setGraphTransform(
                  [target.position.x, target.position.y, target.position.z],
                  [target.rotation.x, target.rotation.y, target.rotation.z]
                )
              }
            }}
          >
            <mesh>
              <planeGeometry args={[0.26, 0.08]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </Handle>
        </group>
      </group>
    </HandleTarget>
  )
}
