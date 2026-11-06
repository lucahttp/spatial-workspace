import { Handle, HandleTarget } from '@react-three/handle'
import { useFrame } from '@react-three/fiber'
import { Container, Text } from '@react-three/uikit'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from '@react-three/uikit-lucide'
import { Line } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import { Group, Vector3 } from 'three'
import { Card as CardType, useWorkspace } from '../store'
import { color, layout, radius, type as typeScale } from '../theme'
import { px, PIXEL } from './Panel'
import { cleanText, UiRoot } from './Ui'

/** Radius of the carousel arc. */
const ARC_R = 1.85
/** Angular step per card slot. */
const ARC_STEP = 0.18
/** Z of the middle card (the farthest point of the arc). */
const ARC_Z = -1.25

function arcSlot(index: number, count: number, offsetIndex = 0) {
  const mid = (count - 1) / 2
  const a = (index - mid + offsetIndex) * ARC_STEP
  return {
    x: ARC_R * Math.sin(a),
    z: ARC_Z + ARC_R * (1 - Math.cos(a)),
    rotY: a,
  }
}

const CARD_W = px(layout.cardW)
const CARD_H = px(layout.cardH)

function CardItem({
  card,
  index,
  count,
  offsetIndex,
  selected,
  onSelect,
  onDrop,
  onArchive,
  onDiscard,
  onDragMove,
}: {
  card: CardType
  index: number
  count: number
  offsetIndex: number
  selected: boolean
  onSelect: () => void
  onDrop: (card: CardType, position: Vector3) => void
  onArchive: (card: CardType) => void
  onDiscard: (card: CardType) => void
  onDragMove: (card: CardType, position: Vector3 | null) => void
}) {
  const groupRef = useRef<Group>(null)
  const dragging = useRef(false)
  const [hovered, setHovered] = useState(false)
  const [barHovered, setBarHovered] = useState(false)
  const toggleFavorite = useWorkspace((s) => s.toggleFavorite)

  const slot = useMemo(() => arcSlot(index, count, offsetIndex), [index, count, offsetIndex])
  const home = useMemo(
    () => new Vector3(slot.x, layout.carouselY, slot.z),
    [slot.x, slot.z],
  )

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g || dragging.current) return
    const targetY = home.y + (selected ? 0.03 : hovered ? 0.018 : 0)
    const targetZ = home.z + (selected ? 0.05 : hovered ? 0.035 : 0)
    g.position.x += (home.x - g.position.x) * Math.min(1, delta * 7)
    g.position.y += (targetY - g.position.y) * Math.min(1, delta * 7)
    g.position.z += (targetZ - g.position.z) * Math.min(1, delta * 8)
    g.rotation.y += (slot.rotY - g.rotation.y) * Math.min(1, delta * 7)
  })

  const borderColor = card.isSpotlight
    ? color.borderSpotlight
    : selected
    ? color.borderActive
    : hovered
    ? color.borderHover
    : color.borderSubtle

  return (
    <HandleTarget targetRef={groupRef}>
      <group ref={groupRef} position={[home.x, home.y, home.z]} rotation={[0, slot.rotY, 0]}>
        {/* Realistic visionOS Depth Shadow */}
        <mesh position={[0, -0.008, -0.005]}>
          <planeGeometry args={[layout.cardW + 0.015, layout.cardH + 0.015]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={selected ? 0.32 : hovered ? 0.22 : 0.10}
            depthWrite={false}
          />
        </mesh>

        <UiRoot
          width={CARD_W}
          height={CARD_H}
          anchorY="center"
          pixelSize={PIXEL}
          alignItems="center"
          justifyContent="center"
        >
          <Container
            width={CARD_W}
            height={CARD_H}
            overflow="hidden"
            backgroundColor={
              card.isSpotlight
                ? color.glassCardSpotlight
                : selected
                ? color.glassCardActive
                : hovered
                ? color.glassCardHover
                : color.glassCard
            }
            borderColor={borderColor}
            borderTopWidth={selected ? 2.5 : 1.5}
            borderBottomWidth={selected ? 2.5 : 1.5}
            borderLeftWidth={selected ? 2.5 : 1.5}
            borderRightWidth={selected ? 2.5 : 1.5}
            borderBend={0.4}
            borderTopLeftRadius={radius.card}
            borderTopRightRadius={radius.card}
            borderBottomLeftRadius={radius.card}
            borderBottomRightRadius={radius.card}
            panelMaterialClass="glass"
            flexDirection="column"
            alignItems="flex-start"
            paddingTop={16}
            paddingBottom={36}
            paddingLeft={18}
            paddingRight={18}
            onClick={onSelect}
            onHoverChange={setHovered}
            cursor="pointer"
          >
            {/* Top Specular Edge Glint */}
            <Container
              positionType="absolute"
              positionTop={0}
              positionLeft={14}
              positionRight={14}
              height={1}
              backgroundColor={card.isSpotlight ? color.purple : selected ? color.accent : 'rgba(255, 255, 255, 0.9)'}
            />

            {/* Header: Category Badge (Left) & Favorite Heart (Right, uploaded_media_2/3) */}
            <Container
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              width="100%"
              marginBottom={12}
            >
              <Container
                flexDirection="row"
                alignItems="center"
                gapColumn={6}
                paddingTop={3}
                paddingBottom={3}
                paddingLeft={10}
                paddingRight={10}
                borderTopLeftRadius={999}
                borderTopRightRadius={999}
                borderBottomLeftRadius={999}
                borderBottomRightRadius={999}
                backgroundColor={
                  card.isSpotlight
                    ? 'rgba(124, 58, 237, 0.15)'
                    : 'rgba(2, 132, 199, 0.14)'
                }
              >
                <Container
                  width={6}
                  height={6}
                  borderTopLeftRadius={3}
                  borderTopRightRadius={3}
                  borderBottomLeftRadius={3}
                  borderBottomRightRadius={3}
                  backgroundColor={card.isSpotlight ? color.purple : color.accent}
                />
                <Text
                  fontSize={typeScale.micro}
                  fontWeight={700}
                  color={card.isSpotlight ? color.purple : color.accentDim}
                  letterSpacing={0.8}
                >
                  {cleanText(card.badge)}
                </Text>
              </Container>

              {/* Heart Favorite Toggle (User reference: uploaded_media_2 & uploaded_media_3) */}
              {!card.isSpotlight && (
                <Container
                  cursor="pointer"
                  width={28}
                  height={28}
                  borderTopLeftRadius={14}
                  borderTopRightRadius={14}
                  borderBottomLeftRadius={14}
                  borderBottomRightRadius={14}
                  backgroundColor={card.favorite ? 'rgba(124, 58, 237, 0.18)' : 'rgba(0, 0, 0, 0.05)'}
                  alignItems="center"
                  justifyContent="center"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(card.id)
                  }}
                >
                  <HeartIcon width={14} color={card.favorite ? color.purple : '#94a3b8'} />
                </Container>
              )}
            </Container>

            {/* Spotlight Card Layout vs Standard Doc Card Layout */}
            {card.isSpotlight ? (
              <Container
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                width="100%"
                flexGrow={1}
                gapRow={8}
              >
                <Container
                  width={52}
                  height={52}
                  borderTopLeftRadius={26}
                  borderTopRightRadius={26}
                  borderBottomLeftRadius={26}
                  borderBottomRightRadius={26}
                  backgroundColor="rgba(124, 58, 237, 0.18)"
                  borderColor={color.purple}
                  borderTopWidth={2}
                  borderBottomWidth={2}
                  borderLeftWidth={2}
                  borderRightWidth={2}
                  alignItems="center"
                  justifyContent="center"
                >
                  <PlusIcon width={24} color={color.purple} />
                </Container>
                <Text fontSize={typeScale.title} fontWeight={700} color={color.cardTextPrimary} textAlign="center">
                  {cleanText(card.title)}
                </Text>
                <Container
                  width={34}
                  height={3.5}
                  borderTopLeftRadius={2}
                  borderTopRightRadius={2}
                  borderBottomLeftRadius={2}
                  borderBottomRightRadius={2}
                  backgroundColor={color.purple}
                />
                <Text fontSize={typeScale.caption} color={color.cardTextSecondary} textAlign="center" lineHeight={1.35}>
                  {cleanText(card.summary)}
                </Text>
                <Container
                  cursor="pointer"
                  width="100%"
                  height={32}
                  borderTopLeftRadius={16}
                  borderTopRightRadius={16}
                  borderBottomLeftRadius={16}
                  borderBottomRightRadius={16}
                  backgroundColor={color.purple}
                  alignItems="center"
                  justifyContent="center"
                  marginTop={6}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect()
                  }}
                >
                  <Text fontSize={11} fontWeight={700} color="#ffffff">
                    {cleanText('+ Abrir Búsqueda')}
                  </Text>
                </Container>
              </Container>
            ) : (
              <Container flexDirection="column" width="100%" flexGrow={1} alignItems="flex-start">
                {/* Title */}
                <Text
                  fontSize={14}
                  fontWeight={700}
                  color={color.cardTextPrimary}
                  lineHeight={1.3}
                  marginBottom={4}
                >
                  {cleanText(card.title)}
                </Text>

                {/* Blue Horizontal Accent Underline (User reference: uploaded_media_3) */}
                <Container
                  width={36}
                  height={3.5}
                  borderTopLeftRadius={2}
                  borderTopRightRadius={2}
                  borderBottomLeftRadius={2}
                  borderBottomRightRadius={2}
                  backgroundColor={color.accent}
                  marginBottom={8}
                />

                {/* Summary with whitespace */}
                <Container width="100%" flexGrow={1} marginBottom={8}>
                  <Text
                    fontSize={11}
                    color={color.cardTextSecondary}
                    lineHeight={1.4}
                  >
                    {cleanText(card.summary)}
                  </Text>
                </Container>

                {/* Primary Pill Button (User reference: uploaded_media_3) */}
                <Container
                  cursor="pointer"
                  width="100%"
                  height={32}
                  borderTopLeftRadius={16}
                  borderTopRightRadius={16}
                  borderBottomLeftRadius={16}
                  borderBottomRightRadius={16}
                  backgroundColor={color.accent}
                  alignItems="center"
                  justifyContent="center"
                  marginTop={6}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect()
                  }}
                >
                  <Text fontSize={11} fontWeight={700} color="#ffffff">
                    {cleanText('Ver Documento')}
                  </Text>
                </Container>
              </Container>
            )}

            {/* PICO OS 5 Grab Bar */}
            <Container
              positionType="absolute"
              positionBottom={8}
              width="100%"
              height={22}
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              gapColumn={8}
              onHoverChange={setBarHovered}
            >
              <Container
                cursor="pointer"
                width={18}
                height={18}
                borderTopLeftRadius={9}
                borderTopRightRadius={9}
                borderBottomLeftRadius={9}
                borderBottomRightRadius={9}
                backgroundColor={barHovered ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.05)'}
                alignItems="center"
                justifyContent="center"
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive(card)
                }}
              >
                <MinusIcon width={9} color={barHovered ? color.cardTextPrimary : color.cardTextDim} />
              </Container>
              <Container
                cursor="pointer"
                width={18}
                height={18}
                borderTopLeftRadius={9}
                borderTopRightRadius={9}
                borderBottomLeftRadius={9}
                borderBottomRightRadius={9}
                backgroundColor={barHovered ? 'rgba(244,63,94,0.22)' : 'rgba(0,0,0,0.05)'}
                alignItems="center"
                justifyContent="center"
                onClick={(e) => {
                  e.stopPropagation()
                  onDiscard(card)
                }}
              >
                <XIcon width={9} color={barHovered ? color.danger : color.cardTextDim} />
              </Container>
              <Container
                width={barHovered ? 56 : 38}
                height={4.5}
                borderTopLeftRadius={2.5}
                borderTopRightRadius={2.5}
                borderBottomLeftRadius={2.5}
                borderBottomRightRadius={2.5}
                backgroundColor={barHovered ? color.accent : 'rgba(0,0,0,0.18)'}
              />
            </Container>
          </Container>
        </UiRoot>

        {/* Grab target for @react-three/handle */}
        <group position-y={-layout.cardH / 2 + 0.02}>
          <Handle
            targetRef={groupRef}
            translate
            scale={false}
            rotate={false}
            multitouch={false}
            apply={(state, target) => {
              if (state.first) {
                dragging.current = true
              }
              target.position.copy(state.current.position)
              onDragMove(card, state.current.position)
              if (state.last) {
                dragging.current = false
                onDragMove(card, null)
                onDrop(card, target.position)
              }
            }}
          >
            <mesh>
              <planeGeometry args={[0.20, 0.04]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </Handle>
        </group>
      </group>
    </HandleTarget>
  )
}

export function Carousel() {
  const cards = useWorkspace((s) => s.cards)
  const selectedId = useWorkspace((s) => s.selectedId)
  const select = useWorkspace((s) => s.select)
  const spawn = useWorkspace((s) => s.spawnSpotlight)
  const archive = useWorkspace((s) => s.archive)
  const discard = useWorkspace((s) => s.discard)

  const [slideOffset, setSlideOffset] = useState(0)
  const [activeDragPos, setActiveDragPos] = useState<Vector3 | null>(null)

  const archivePos = useMemo(() => new Vector3(-layout.padX, layout.padY, layout.padZ), [])
  const trashPos = useMemo(() => new Vector3(layout.padX, layout.padY, layout.padZ), [])

  const handleDrop = (card: CardType, position: Vector3) => {
    if (card.isSpotlight) return
    if (position.distanceTo(archivePos) < 0.38) {
      archive(card.id, [position.x, position.y, position.z])
    } else if (position.distanceTo(trashPos) < 0.38) {
      discard(card.id)
    }
  }

  // Calculate magnetic tether line when dragging near pads
  const tether = useMemo(() => {
    if (!activeDragPos) return null
    const dArch = activeDragPos.distanceTo(archivePos)
    const dTrash = activeDragPos.distanceTo(trashPos)
    if (dArch < 0.6) {
      return {
        points: [
          [activeDragPos.x, activeDragPos.y, activeDragPos.z],
          [archivePos.x, archivePos.y + 0.06, archivePos.z],
        ] as [number, number, number][],
        color: color.success,
      }
    }
    if (dTrash < 0.6) {
      return {
        points: [
          [activeDragPos.x, activeDragPos.y, activeDragPos.z],
          [trashPos.x, trashPos.y + 0.06, trashPos.z],
        ] as [number, number, number][],
        color: color.danger,
      }
    }
    return null
  }, [activeDragPos, archivePos, trashPos])

  return (
    <group>
      {/* Magnetic Gooey Elastic Tether */}
      {tether && (
        <Line
          points={tether.points}
          color={tether.color}
          lineWidth={3.5}
          transparent
          opacity={0.88}
          raycast={() => null}
        />
      )}

      {/* Cards in arc */}
      {cards.map((card, i) => (
        <CardItem
          key={card.id}
          card={card}
          index={i}
          count={cards.length}
          offsetIndex={slideOffset}
          selected={card.id === selectedId}
          onSelect={() => (card.isSpotlight ? spawn() : select(card.id))}
          onDrop={handleDrop}
          onArchive={(c) => archive(c.id)}
          onDiscard={(c) => discard(c.id)}
          onDragMove={(_, pos) => setActiveDragPos(pos ? pos.clone() : null)}
        />
      ))}

      {/* Modern Frosted Glass Navigation Chevrons `<` and `>` */}
      {cards.length > 2 && (
        <>
          <group
            position={[-0.56, layout.carouselY, -1.16]}
            rotation={[0, 0.35, 0]}
            onClick={() => setSlideOffset((o) => o + 1)}
          >
            <UiRoot width={px(0.046)} height={px(0.046)} anchorY="center" pixelSize={PIXEL} alignItems="center" justifyContent="center">
              <Container
                cursor="pointer"
                width={36}
                height={36}
                borderTopLeftRadius={18}
                borderTopRightRadius={18}
                borderBottomLeftRadius={18}
                borderBottomRightRadius={18}
                backgroundColor="rgba(15, 23, 42, 0.88)"
                borderColor="rgba(255, 255, 255, 0.22)"
                borderTopWidth={1.5}
                borderBottomWidth={1}
                borderLeftWidth={1}
                borderRightWidth={1}
                alignItems="center"
                justifyContent="center"
              >
                <ChevronLeftIcon width={16} color={color.textPrimary} />
              </Container>
            </UiRoot>
          </group>

          <group
            position={[0.56, layout.carouselY, -1.16]}
            rotation={[0, -0.35, 0]}
            onClick={() => setSlideOffset((o) => o - 1)}
          >
            <UiRoot width={px(0.046)} height={px(0.046)} anchorY="center" pixelSize={PIXEL} alignItems="center" justifyContent="center">
              <Container
                cursor="pointer"
                width={36}
                height={36}
                borderTopLeftRadius={18}
                borderTopRightRadius={18}
                borderBottomLeftRadius={18}
                borderBottomRightRadius={18}
                backgroundColor="rgba(15, 23, 42, 0.88)"
                borderColor="rgba(255, 255, 255, 0.22)"
                borderTopWidth={1.5}
                borderBottomWidth={1}
                borderLeftWidth={1}
                borderRightWidth={1}
                alignItems="center"
                justifyContent="center"
              >
                <ChevronRightIcon width={16} color={color.textPrimary} />
              </Container>
            </UiRoot>
          </group>
        </>
      )}
    </group>
  )
}
