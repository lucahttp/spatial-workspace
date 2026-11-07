import { Container, Text } from '@react-three/uikit'
import {
  CodeIcon,
  EyeIcon,
  FileTextIcon,
  HouseIcon,
  LogOutIcon,
  MicIcon,
  PencilIcon,
  PlusIcon,
} from '@react-three/uikit-lucide'
import { ReactNode, useState } from 'react'
import { color, layout, radius } from '../theme'
import { px, PIXEL } from './Panel'
import { cleanText, UiRoot } from './Ui'

type DockItem = {
  id: string
  label: string
  icon: ReactNode
}

const ITEMS: DockItem[] = [
  { id: 'all', label: 'Inicio', icon: <HouseIcon width={16} color={color.textPrimary} /> },
  { id: 'code', label: 'wZed', icon: <CodeIcon width={16} color={color.textPrimary} /> },
  { id: 'preview', label: 'Preview', icon: <EyeIcon width={16} color={color.textPrimary} /> },
  { id: 'carousel', label: 'Fuentes', icon: <FileTextIcon width={16} color={color.textPrimary} /> },
  { id: 'voice', label: 'Voz', icon: <MicIcon width={16} color={color.textPrimary} /> },
]

function DockIconButton({
  item,
  onClick,
  active,
}: {
  item: DockItem
  onClick: () => void
  active?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <Container
      cursor="pointer"
      width={44}
      height={44}
      borderTopLeftRadius={12}
      borderTopRightRadius={12}
      borderBottomLeftRadius={12}
      borderBottomRightRadius={12}
      backgroundColor={
        hovered ? 'rgba(255,255,255,0.18)' : active ? 'rgba(14, 165, 233, 0.22)' : 'rgba(255,255,255,0.05)'
      }
      borderColor={hovered ? 'rgba(255,255,255,0.40)' : active ? color.accent : 'rgba(255,255,255,0.10)'}
      borderTopWidth={1}
      borderBottomWidth={1}
      borderLeftWidth={1}
      borderRightWidth={1}
      alignItems="center"
      justifyContent="center"
      onClick={onClick}
      onHoverChange={setHovered}
    >
      {item.icon}
    </Container>
  )
}

export function Dock({
  onAction,
  active,
}: {
  onAction: (id: string) => void
  active?: string
}) {
  const [plusHovered, setPlusHovered] = useState(false)
  const [editHovered, setEditHovered] = useState(false)
  const [exitHovered, setExitHovered] = useState(false)

  return (
    <group position={[0, layout.dockY, layout.dockZ]} rotation={[-0.42, 0, 0]}>
      {/* Realistic visionOS Drop Shadow */}
      <mesh position={[0, -0.006, -0.005]}>
        <planeGeometry args={[layout.dockW + 0.04, 0.10]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} depthWrite={false} />
      </mesh>

      <UiRoot
        width={px(layout.dockW)}
        height={px(0.09)}
        anchorY="center"
        pixelSize={PIXEL}
        alignItems="center"
        justifyContent="center"
      >
        <Container
          width={px(layout.dockW)}
          height={px(0.09)}
          backgroundColor={color.glassDock}
          borderColor={color.borderSubtle}
          borderTopWidth={1.5}
          borderBottomWidth={1}
          borderLeftWidth={1}
          borderRightWidth={1}
          borderBend={0.5}
          borderTopLeftRadius={radius.dock}
          borderTopRightRadius={radius.dock}
          borderBottomLeftRadius={radius.dock}
          borderBottomRightRadius={radius.dock}
          panelMaterialClass="glass"
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          gapColumn={10}
          paddingLeft={16}
          paddingRight={16}
        >
          {/* Top Specular Hairline Glint */}
          <Container
            positionType="absolute"
            positionTop={0}
            positionLeft={24}
            positionRight={24}
            height={1}
            backgroundColor={color.borderSpecular}
          />

          {/* Left standard outline icon buttons (User reference: uploaded_media_2) */}
          {ITEMS.map((item) => (
            <DockIconButton
              key={item.id}
              item={item}
              onClick={() => onAction(item.id)}
              active={active === item.id}
            />
          ))}

          {/* Prominent Circular Purple (+) Action Button (User reference: uploaded_media_2) */}
          <Container
            cursor="pointer"
            width={48}
            height={48}
            borderTopLeftRadius={24}
            borderTopRightRadius={24}
            borderBottomLeftRadius={24}
            borderBottomRightRadius={24}
            backgroundColor={plusHovered ? color.purpleDim : color.purple}
            borderColor="rgba(255, 255, 255, 0.35)"
            borderTopWidth={1.5}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            alignItems="center"
            justifyContent="center"
            marginLeft={4}
            marginRight={4}
            onClick={() => onAction('spotlight')}
            onHoverChange={setPlusHovered}
          >
            <PlusIcon width={22} color="#ffffff" />
          </Container>

          {/* Pill Edit/Centrar Button (User reference: uploaded_media_2) */}
          <Container
            cursor="pointer"
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            gapColumn={6}
            height={40}
            paddingLeft={14}
            paddingRight={14}
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            borderBottomLeftRadius={20}
            borderBottomRightRadius={20}
            backgroundColor={editHovered ? color.purpleDim : color.purple}
            borderColor="rgba(255, 255, 255, 0.30)"
            borderTopWidth={1.5}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            onClick={() => onAction('recenter')}
            onHoverChange={setEditHovered}
          >
            <Text fontSize={12} fontWeight={700} color="#ffffff">
              {cleanText('Centrar')}
            </Text>
            <PencilIcon width={13} color="#ffffff" />
          </Container>

          {/* Dedicated Exit XR Button (User request: tendria que tener un exit button para salir) */}
          <Container
            cursor="pointer"
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            gapColumn={6}
            height={40}
            paddingLeft={12}
            paddingRight={12}
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            borderBottomLeftRadius={20}
            borderBottomRightRadius={20}
            backgroundColor={exitHovered ? 'rgba(244, 63, 94, 0.40)' : 'rgba(244, 63, 94, 0.22)'}
            borderColor={exitHovered ? color.danger : 'rgba(251, 113, 133, 0.40)'}
            borderTopWidth={1.5}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            onClick={() => onAction('exit')}
            onHoverChange={setExitHovered}
          >
            <LogOutIcon width={13} color="#fca5a5" />
            <Text fontSize={11} fontWeight={700} color="#fca5a5">
              {cleanText('Salir')}
            </Text>
          </Container>
        </Container>
      </UiRoot>
    </group>
  )
}
