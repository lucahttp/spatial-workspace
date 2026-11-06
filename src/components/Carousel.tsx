import { Handle, HandleTarget } from '@react-three/handle'
import { useFrame } from '@react-three/fiber'
import { Container, Text } from '@react-three/uikit'
import {
  ArchiveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  FileTextIcon,
  GlobeIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from '@react-three/uikit-lucide'
import { Line } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import { AdditiveBlending, Group, Vector3 } from 'three'
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
        {/* Soft Volumetric Halo / Border Beam Glow (Libraries.dev bloom layer) */}
        <mesh position={[0, 0, -0.007]}>
          <planeGeometry args={[layout.cardW + 0.04, layout.cardH + 0.04]} />
          <meshBasicMaterial
            color={card.isSpotlight ? color.success : selected ? color.accent : color.accent}
            transparent
            opacity={card.isSpotlight ? 0.30 : selected ? 0.28 : hovered ? 0.16 : 0.04}
            depthWrite={false}
            blending={AdditiveBlending}
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
            borderTopWidth={selected || card.isSpotlight ? 2 : 1.5}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            borderBend={0.5}
            borderTopLeftRadius={radius.card}
            borderTopRightRadius={radius.card}
            borderBottomLeftRadius={radius.card}
            borderBottomRightRadius={radius.card}
            panelMaterialClass="glass"
            flexDirection="column"
            alignItems="flex-start"
            paddingTop={16}
            paddingBottom={44}
            paddingLeft={18}
            paddingRight={18}
            onClick={onSelect}
            onHoverChange={setHovered}
            cursor="pointer"
          >
            {/* Top Specular Edge Glint (Refractive Glass Highlight) */}
            <Container
              positionType="absolute"
              positionTop={0}
              positionLeft={14}
              positionRight={14}
              height={1}
              backgroundColor={card.isSpotlight ? color.success : selected ? color.accent : color.borderSpecular}
            />
            {/* Header Badge & Category Tag */}
            <Container
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              width="100%"
              marginBottom={8}
            >
              <Container
                flexDirection="row"
                alignItems="center"
                gapColumn={6}
                paddingTop={3}
                paddingBottom={3}
                paddingLeft={8}
                paddingRight={8}
                borderTopLeftRadius={999}
                borderTopRightRadius={999}
                borderBottomLeftRadius={999}
                borderBottomRightRadius={999}
                backgroundColor={
                  card.isSpotlight
                    ? 'rgba(52, 211, 153, 0.22)'
                    : selected
                    ? 'rgba(56, 189, 248, 0.20)'
                    : 'rgba(255, 255, 255, 0.08)'
                }
              >
                <Container
                  width={6}
                  height={6}
                  borderTopLeftRadius={3}
                  borderTopRightRadius={3}
                  borderBottomLeftRadius={3}
                  borderBottomRightRadius={3}
                  backgroundColor={card.isSpotlight ? color.success : selected ? color.accent : color.textMuted}
                />
                <Text
                  fontSize={typeScale.micro}
                  fontWeight={700}
                  color={card.isSpotlight ? color.success : selected ? color.accent : color.textSecondary}
                  letterSpacing={0.8}
                >
                  {cleanText(card.badge)}
                </Text>
              </Container>

              {card.isSpotlight && (
                <Container flexDirection="row" alignItems="center" gapColumn={4}>
                  <SparklesIcon width={10} color={color.success} />
                  <Text fontSize={typeScale.micro} color={color.success} fontWeight={700}>
                    {cleanText('NUEVO')}
                  </Text>
                </Container>
              )}
            </Container>

            {/* Boceto 2 Spotlight Center Lens: (+) Icon inside circle */}
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
                  width={54}
                  height={54}
                  borderTopLeftRadius={27}
                  borderTopRightRadius={27}
                  borderBottomLeftRadius={27}
                  borderBottomRightRadius={27}
                  backgroundColor="rgba(52, 211, 153, 0.22)"
                  borderColor={color.success}
                  borderTopWidth={2}
                  borderBottomWidth={2}
                  borderLeftWidth={2}
                  borderRightWidth={2}
                  alignItems="center"
                  justifyContent="center"
                >
                  <PlusIcon width={24} color={color.success} />
                </Container>
                <Text fontSize={typeScale.title} fontWeight={700} color={color.textPrimary} textAlign="center">
                  {cleanText(card.title)}
                </Text>
                <Text fontSize={typeScale.body} color={color.textSecondary} textAlign="center" lineHeight={1.35}>
                  {cleanText(
                    card.summary.length > 95 ? card.summary.slice(0, 92) + '...' : card.summary
                  )}
                </Text>
                <Container
                  flexDirection="row"
                  alignItems="center"
                  gapColumn={6}
                  paddingLeft={12}
                  paddingRight={12}
                  paddingTop={6}
                  paddingBottom={6}
                  backgroundColor="rgba(52, 211, 153, 0.25)"
                  borderColor={color.success}
                  borderTopWidth={1}
                  borderBottomWidth={1}
                  borderLeftWidth={1}
                  borderRightWidth={1}
                  borderTopLeftRadius={999}
                  borderTopRightRadius={999}
                  borderBottomLeftRadius={999}
                  borderBottomRightRadius={999}
                  marginTop={6}
                >
                  <SearchIcon width={12} color={color.success} />
                  <Text fontSize={typeScale.caption} fontWeight={700} color={color.success}>
                    {cleanText('+ Abrir Busqueda')}
                  </Text>
                </Container>
              </Container>
            ) : (
              <Container flexDirection="column" width="100%" flexGrow={1} alignItems="flex-start">
                {/* Card Title & Icon Header */}
                <Container flexDirection="row" alignItems="center" gapColumn={8} width="100%" marginTop={6} marginBottom={6}>
                  <Container
                    width={28}
                    height={28}
                    borderTopLeftRadius={8}
                    borderTopRightRadius={8}
                    borderBottomLeftRadius={8}
                    borderBottomRightRadius={8}
                    backgroundColor="rgba(255, 255, 255, 0.08)"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    {card.badge.includes('DOC') ? (
                      <FileTextIcon width={14} color={color.accent} />
                    ) : card.badge.includes('WEB') ? (
                      <GlobeIcon width={14} color={color.accent} />
                    ) : (
                      <SparklesIcon width={14} color={color.purple} />
                    )}
                  </Container>
                  <Container flexDirection="column" flexGrow={1} flexShrink={1}>
                    <Text
                      fontSize={13}
                      fontWeight={700}
                      color={color.textPrimary}
                      lineHeight={1.3}
                    >
                      {cleanText(card.title)}
                    </Text>
                  </Container>
                </Container>

                {/* Inset Frosted Glass Summary Box */}
                <Container
                  width="100%"
                  height={58}
                  paddingLeft={10}
                  paddingRight={10}
                  paddingTop={8}
                  paddingBottom={8}
                  backgroundColor="rgba(0, 0, 0, 0.35)"
                  borderColor="rgba(255, 255, 255, 0.08)"
                  borderTopWidth={1}
                  borderBottomWidth={1}
                  borderLeftWidth={1}
                  borderRightWidth={1}
                  borderTopLeftRadius={10}
                  borderTopRightRadius={10}
                  borderBottomLeftRadius={10}
                  borderBottomRightRadius={10}
                  marginBottom={8}
                  overflow="hidden"
                >
                  <Text
                    fontSize={10}
                    color={color.textSecondary}
                    lineHeight={1.35}
                  >
                    {cleanText(card.summary)}
                  </Text>
                </Container>

                {/* Bottom Actions Row (Anti-Gorilla-Arm micro pills) */}
                <Container
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  width="100%"
                  gapColumn={6}
                >
                  <Container
                    cursor="pointer"
                    flexGrow={1}
                    height={28}
                    borderTopLeftRadius={radius.button}
                    borderTopRightRadius={radius.button}
                    borderBottomLeftRadius={radius.button}
                    borderBottomRightRadius={radius.button}
                    backgroundColor={selected ? 'rgba(56, 189, 248, 0.28)' : 'rgba(56, 189, 248, 0.14)'}
                    borderColor={selected ? color.accent : 'rgba(56, 189, 248, 0.40)'}
                    borderTopWidth={1}
                    borderBottomWidth={1}
                    borderLeftWidth={1}
                    borderRightWidth={1}
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="center"
                    gapColumn={4}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect()
                    }}
                  >
                    <EyeIcon width={11} color={color.accent} />
                    <Text fontSize={9} fontWeight={700} color={color.accent}>
                      {cleanText('Ver')}
                    </Text>
                  </Container>

                  <Container
                    cursor="pointer"
                    flexGrow={1}
                    height={28}
                    borderTopLeftRadius={radius.button}
                    borderTopRightRadius={radius.button}
                    borderBottomLeftRadius={radius.button}
                    borderBottomRightRadius={radius.button}
                    backgroundColor="rgba(52, 211, 153, 0.14)"
                    borderColor="rgba(52, 211, 153, 0.40)"
                    borderTopWidth={1}
                    borderBottomWidth={1}
                    borderLeftWidth={1}
                    borderRightWidth={1}
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="center"
                    gapColumn={4}
                    onClick={(e) => {
                      e.stopPropagation()
                      onArchive(card)
                    }}
                  >
                    <ArchiveIcon width={11} color={color.success} />
                    <Text fontSize={9} fontWeight={700} color={color.success}>
                      {cleanText('Archivar')}
                    </Text>
                  </Container>

                  <Container
                    cursor="pointer"
                    flexGrow={1}
                    height={28}
                    borderTopLeftRadius={radius.button}
                    borderTopRightRadius={radius.button}
                    borderBottomLeftRadius={radius.button}
                    borderBottomRightRadius={radius.button}
                    backgroundColor="rgba(251, 113, 133, 0.12)"
                    borderColor="rgba(251, 113, 133, 0.35)"
                    borderTopWidth={1}
                    borderBottomWidth={1}
                    borderLeftWidth={1}
                    borderRightWidth={1}
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="center"
                    gapColumn={4}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDiscard(card)
                    }}
                  >
                    <Trash2Icon width={11} color={color.danger} />
                    <Text fontSize={9} fontWeight={700} color={color.danger}>
                      {cleanText('Borrar')}
                    </Text>
                  </Container>
                </Container>
              </Container>
            )}

            {/* PICO OS 5 Grab Bar */}
            <Container
              positionType="absolute"
              positionBottom={6}
              width="100%"
              height={22}
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              gapColumn={8}
              onHoverChange={setBarHovered}
            >
              <Container
                width={16}
                height={16}
                borderTopLeftRadius={8}
                borderTopRightRadius={8}
                borderBottomLeftRadius={8}
                borderBottomRightRadius={8}
                backgroundColor={barHovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'}
                alignItems="center"
                justifyContent="center"
              >
                <MinusIcon width={8} color={barHovered ? color.textPrimary : color.textMuted} />
              </Container>
              <Container
                width={16}
                height={16}
                borderTopLeftRadius={8}
                borderTopRightRadius={8}
                borderBottomLeftRadius={8}
                borderBottomRightRadius={8}
                backgroundColor={barHovered ? 'rgba(244,63,94,0.22)' : 'rgba(255,255,255,0.06)'}
                alignItems="center"
                justifyContent="center"
              >
                <XIcon width={8} color={barHovered ? color.danger : color.textMuted} />
              </Container>
              <Container
                width={barHovered ? 58 : 36}
                height={4.5}
                borderTopLeftRadius={2.5}
                borderTopRightRadius={2.5}
                borderBottomLeftRadius={2.5}
                borderBottomRightRadius={2.5}
                backgroundColor={barHovered ? color.accent : 'rgba(255,255,255,0.22)'}
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
