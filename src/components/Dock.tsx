import { Container, Text } from '@react-three/uikit'
import {
  ArchiveIcon,
  CompassIcon,
  GlobeIcon,
  LayersIcon,
  MessageSquareIcon,
  NetworkIcon,
  PlusIcon,
  RotateCcwIcon,
} from '@react-three/uikit-lucide'
import { ReactNode, useState } from 'react'
import { AdditiveBlending } from 'three'
import { color, layout, radius } from '../theme'
import { px, PIXEL } from './Panel'
import { cleanText, UiRoot } from './Ui'

type DockItem = {
  id: string
  label: string
  icon: ReactNode
  tint: string
}

const ITEMS: DockItem[] = [
  { id: 'all', label: 'Todo', icon: <LayersIcon width={16} color={color.textPrimary} />, tint: color.textDim },
  { id: 'voice', label: 'Orbe', icon: <MessageSquareIcon width={16} color={color.accent} />, tint: color.accent },
  { id: 'carousel', label: 'Carrusel', icon: <CompassIcon width={16} color={color.accent} />, tint: color.accent },
  { id: 'preview', label: 'Preview', icon: <GlobeIcon width={16} color={color.accent} />, tint: color.accent },
  { id: 'graph', label: 'Grafo', icon: <NetworkIcon width={16} color={color.idea} />, tint: color.idea },
  { id: 'archive', label: 'Archivo', icon: <ArchiveIcon width={16} color={color.success} />, tint: color.success },
  { id: 'spotlight', label: 'Spotlight', icon: <PlusIcon width={16} color={color.success} />, tint: color.success },
  { id: 'recenter', label: 'Centrar', icon: <RotateCcwIcon width={16} color={color.textPrimary} />, tint: color.textDim },
]

function DockButton({
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
      width={46}
      flexDirection="column"
      alignItems="center"
      gapRow={3}
      onClick={onClick}
      onHoverChange={setHovered}
    >
      <Container
        width={38}
        height={38}
        borderTopLeftRadius={radius.button}
        borderTopRightRadius={radius.button}
        borderBottomLeftRadius={radius.button}
        borderBottomRightRadius={radius.button}
        backgroundColor={
          hovered ? 'rgba(255,255,255,0.22)' : active ? item.tint + '40' : 'rgba(255,255,255,0.07)'
        }
        borderColor={hovered ? 'rgba(255,255,255,0.45)' : active ? item.tint : 'rgba(255,255,255,0.12)'}
        borderTopWidth={1.5}
        borderBottomWidth={1}
        borderLeftWidth={1}
        borderRightWidth={1}
        alignItems="center"
        justifyContent="center"
      >
        {item.icon}
      </Container>
      <Text fontSize={9} fontWeight={hovered || active ? 700 : 400} color={hovered ? color.textPrimary : color.textDim}>
        {cleanText(item.label)}
      </Text>
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
  return (
    <group position={[0, layout.dockY, layout.dockZ]} rotation={[-0.42, 0, 0]}>
      {/* Soft Volumetric Backlight Halo */}
      <mesh position={[0, 0, -0.006]}>
        <planeGeometry args={[layout.dockW + 0.05, 0.11]} />
        <meshBasicMaterial
          color={color.accent}
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={AdditiveBlending}
        />
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
          gapColumn={8}
          paddingTop={8}
          paddingBottom={6}
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

          {ITEMS.map((item) => (
            <DockButton key={item.id} item={item} onClick={() => onAction(item.id)} active={active === item.id} />
          ))}
        </Container>
      </UiRoot>
    </group>
  )
}
