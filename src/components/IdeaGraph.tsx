import { Line, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Mesh } from 'three'
import { useWorkspace } from '../store'
import { color, layout } from '../theme'
import { cleanText, DREI_FONT } from './Ui'

export function IdeaGraph() {
  const sources = useWorkspace((s) => s.sources)
  const select = useWorkspace((s) => s.select)
  const crystalRef = useRef<Mesh>(null)
  const haloRef = useRef<Mesh>(null)

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
    <group position={[layout.graphX, layout.graphY, layout.graphZ]}>
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
    </group>
  )
}
