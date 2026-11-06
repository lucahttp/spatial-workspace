import { Container, Text } from '@react-three/uikit'
import { ArchiveIcon, Trash2Icon } from '@react-three/uikit-lucide'
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh } from 'three'
import { useWorkspace } from '../store'
import { color, layout, radius, type as typeScale } from '../theme'
import { px, PIXEL } from './Panel'
import { cleanText, UiRoot } from './Ui'

function ArchivePedestal({ count, hovered, onHoverChange }: { count: number; hovered: boolean; onHoverChange: (h: boolean) => void }) {
  const paperRef = useRef<Group>(null)

  useFrame(() => {
    if (paperRef.current) {
      paperRef.current.position.y = 0.02 + Math.sin(Date.now() * 0.002) * 0.004
    }
  })

  return (
    <group position={[-layout.padX, layout.padY, layout.padZ]} rotation={[-0.42, 0.12, 0]}>
      {/* 3D Frosted Glass & Metal Tray (Boceto 2: Bandeja de Archivar) */}
      <group position={[0, -0.065, -0.03]}>
        {/* Base plinth: Clean matte slate tray */}
        <mesh position={[0, -0.015, 0]}>
          <boxGeometry args={[0.30, 0.024, 0.20]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.5}
            metalness={0.2}
          />
        </mesh>

        {/* Pastel Mint rim frame */}
        <mesh position={[0, 0.002, 0]}>
          <boxGeometry args={[0.304, 0.005, 0.204]} />
          <meshStandardMaterial
            color={color.success}
            roughness={0.3}
            transparent
            opacity={0.65}
          />
        </mesh>

        {/* Stepped pastel mint document leaves (Archival Stack) */}
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

      {/* Surface UI Glass Capsule */}
      <group position={[0, 0.032, 0.015]}>
        <UiRoot width={px(0.34)} height={px(0.10)} anchorY="center" pixelSize={PIXEL} alignItems="center" justifyContent="center">
          <Container
            width={px(0.34)}
            height={px(0.10)}
            backgroundColor={hovered ? 'rgba(16, 185, 129, 0.28)' : 'rgba(10, 20, 16, 0.88)'}
            borderColor={hovered ? color.success : 'rgba(52, 211, 153, 0.45)'}
            borderTopWidth={1.5}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            borderBend={0.5}
            borderTopLeftRadius={radius.card}
            borderTopRightRadius={radius.card}
            borderBottomLeftRadius={radius.card}
            borderBottomRightRadius={radius.card}
            panelMaterialClass="glass"
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            gapColumn={10}
            onHoverChange={onHoverChange}
          >
            {/* Top Specular Glint */}
            <Container
              positionType="absolute"
              positionTop={0}
              positionLeft={16}
              positionRight={16}
              height={1}
              backgroundColor="rgba(52, 211, 153, 0.6)"
            />
            <Container
              width={32}
              height={32}
              borderTopLeftRadius={16}
              borderTopRightRadius={16}
              borderBottomLeftRadius={16}
              borderBottomRightRadius={16}
              backgroundColor="rgba(52, 211, 153, 0.18)"
              alignItems="center"
              justifyContent="center"
            >
              <ArchiveIcon width={16} color={color.success} />
            </Container>
            <Container flexDirection="column" gapRow={2}>
              <Text fontSize={typeScale.section} fontWeight={700} color={color.success} letterSpacing={1}>
                {cleanText('ARCHIVAR')}
              </Text>
              <Text fontSize={typeScale.micro} color={color.textDim}>
                {cleanText(`${count} fuentes en el mapa`)}
              </Text>
            </Container>
          </Container>
        </UiRoot>
      </group>
    </group>
  )
}

function TrashPedestal({ count, hovered, onHoverChange }: { count: number; hovered: boolean; onHoverChange: (h: boolean) => void }) {
  const ringRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.8
    }
  })

  return (
    <group position={[layout.padX, layout.padY, layout.padZ]} rotation={[-0.42, -0.12, 0]}>
      {/* 3D Dark Titanium & Coral Receptacle (Boceto 2: Tacho de Basura) */}
      <group position={[0, -0.07, -0.03]}>
        {/* Recycler cylinder chamber: Clean matte graphite */}
        <mesh>
          <cylinderGeometry args={[0.095, 0.075, 0.13, 32, 1, true]} />
          <meshStandardMaterial
            color="#1e2433"
            roughness={0.6}
            metalness={0.15}
            side={2}
          />
        </mesh>

        {/* Floating Pastel Coral Rim Ring */}
        <mesh ref={ringRef} position={[0, 0.068, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.098, 0.004, 12, 36]} />
          <meshStandardMaterial
            color={color.danger}
            roughness={0.3}
            metalness={0.3}
          />
        </mesh>
      </group>

      {/* Surface UI Glass Capsule */}
      <group position={[0, 0.032, 0.015]}>
        <UiRoot width={px(0.34)} height={px(0.10)} anchorY="center" pixelSize={PIXEL} alignItems="center" justifyContent="center">
          <Container
            width={px(0.34)}
            height={px(0.10)}
            backgroundColor={hovered ? 'rgba(244, 63, 94, 0.28)' : 'rgba(24, 10, 14, 0.88)'}
            borderColor={hovered ? color.danger : 'rgba(251, 113, 133, 0.45)'}
            borderTopWidth={1.5}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            borderBend={0.5}
            borderTopLeftRadius={radius.card}
            borderTopRightRadius={radius.card}
            borderBottomLeftRadius={radius.card}
            borderBottomRightRadius={radius.card}
            panelMaterialClass="glass"
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            gapColumn={10}
            onHoverChange={onHoverChange}
          >
            {/* Top Specular Glint */}
            <Container
              positionType="absolute"
              positionTop={0}
              positionLeft={16}
              positionRight={16}
              height={1}
              backgroundColor="rgba(251, 113, 133, 0.6)"
            />
            <Container
              width={32}
              height={32}
              borderTopLeftRadius={16}
              borderTopRightRadius={16}
              borderBottomLeftRadius={16}
              borderBottomRightRadius={16}
              backgroundColor="rgba(251, 113, 133, 0.18)"
              alignItems="center"
              justifyContent="center"
            >
              <Trash2Icon width={16} color={color.danger} />
            </Container>
            <Container flexDirection="column" gapRow={2}>
              <Text fontSize={typeScale.section} fontWeight={700} color={color.danger} letterSpacing={1}>
                {cleanText('BASURA')}
              </Text>
            <Text fontSize={typeScale.micro} color={color.textDim}>
              {cleanText(`Descartar (${count} items activos)`)}
            </Text>
          </Container>
        </Container>
      </UiRoot>
    </group>
  </group>
)
}

export function Pads() {
  const sources = useWorkspace((s) => s.sources)
  const [archiveHovered, setArchiveHovered] = useState(false)
  const [trashHovered, setTrashHovered] = useState(false)

  return (
    <group>
      <ArchivePedestal
        count={sources.length}
        hovered={archiveHovered}
        onHoverChange={setArchiveHovered}
      />
      <TrashPedestal
        count={sources.length}
        hovered={trashHovered}
        onHoverChange={setTrashHovered}
      />
    </group>
  )
}
