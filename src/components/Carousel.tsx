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
import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Vector3 } from 'three'
import { Card as CardType, useWorkspace } from '../store'
import { color, layout, radius, type as typeScale } from '../theme'
import { canStartDrag, GRAB_USERDATA } from '../interaction'
import { px, PIXEL } from './Panel'
import { cleanText, UiRoot } from './Ui'
import { SpatialCapsule } from './SpatialCapsule'
import { useSpatialAffordance } from '../hooks/useSpatialAffordance'
import { SpatialAffordancePill } from './SpatialAffordancePill'

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
  const [capsuleVisible, setCapsuleVisible] = useState(false)
  const affordance = useSpatialAffordance(groupRef)
  const toggleFavorite = useWorkspace((s) => s.toggleFavorite)
  const detachCard = useWorkspace((s) => s.detachCard)

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

    const dx = home.x - g.position.x
    const dy = targetY - g.position.y
    const dz = targetZ - g.position.z
    const drot = slot.rotY - g.rotation.y

    // Sleep when resting within sub-millimeter / negligible angular distance
    if (Math.abs(dx) < 0.0002 && Math.abs(dy) < 0.0002 && Math.abs(dz) < 0.0002 && Math.abs(drot) < 0.0005) {
      return
    }

    g.position.x += dx * Math.min(1, delta * 7)
    g.position.y += dy * Math.min(1, delta * 7)
    g.position.z += dz * Math.min(1, delta * 8)
    g.rotation.y += drot * Math.min(1, delta * 7)
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

        {/* Auto-Hiding Contextual Actions Capsule (Extraer, Orientar, Descartar) */}
        {!card.isSpotlight && (
          <group position={[0, layout.cardH / 2 + 0.045, 0.02]}>
            <SpatialCapsule
              targetRef={groupRef}
              title={card.title.slice(0, 16)}
              visible={capsuleVisible || hovered}
              onDetach={() => {
                if (groupRef.current) {
                  detachCard(card.id, [
                    groupRef.current.position.x,
                    groupRef.current.position.y,
                    groupRef.current.position.z,
                  ])
                } else {
                  detachCard(card.id)
                }
              }}
              onClose={() => onDiscard(card)}
              onDismiss={() => setCapsuleVisible(false)}
            />
          </group>
        )}

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
            onClick={() => {
              setCapsuleVisible(true)
              onSelect()
            }}
            onHoverChange={(h) => {
              setHovered(h)
              if (h) setCapsuleVisible(true)
            }}
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

            {/* Header: Category Badge (Left) & Favorite Heart (Right) */}
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

              {/* Heart Favorite Toggle */}
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
                <Text
                  fontSize={14}
                  fontWeight={700}
                  color={color.cardTextPrimary}
                  lineHeight={1.3}
                  marginBottom={4}
                >
                  {cleanText(card.title)}
                </Text>

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

                <Container width="100%" flexGrow={1} marginBottom={8}>
                  <Text
                    fontSize={11}
                    color={color.cardTextSecondary}
                    lineHeight={1.4}
                  >
                    {cleanText(card.summary)}
                  </Text>
                </Container>

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
              cursor="grab"
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
                width={barHovered ? 64 : 38}
                height={5}
                borderTopLeftRadius={2.5}
                borderTopRightRadius={2.5}
                borderBottomLeftRadius={2.5}
                borderBottomRightRadius={2.5}
                backgroundColor={barHovered ? color.accent : 'rgba(0,0,0,0.22)'}
              />
            </Container>
          </Container>
        </UiRoot>

        {/* Unified Movement Helper Pill (Revealed on 3s dwell hover, grip button squeeze, or proximity) */}
        <SpatialAffordancePill
          label="MOVER TARJETA"
          visible={affordance.visible}
          isDragging={affordance.isDragging}
          dwellProgress={affordance.dwellProgress}
          yOffset={-layout.cardH / 2 - 0.035}
          width={0.16}
        />

        {/* Two-Handed Generous Grab target for XR Hands & Laser Raycast */}
        <group position={[0, -layout.cardH / 2 + 0.025, 0.025]}>
          <Handle
            targetRef={groupRef}
            translate
            scale={true}
            rotate={true}
            multitouch={true}
            apply={(state, target) => {
              if (state.first) {
                dragging.current = true
                affordance.setIsDragging(true)
              }
              target.position.copy(state.current.position)
              target.rotation.copy(state.current.rotation)
              target.scale.copy(state.current.scale)
              onDragMove(card, state.current.position)
              if (state.last) {
                dragging.current = false
                affordance.setIsDragging(false)
                onDragMove(card, null)
                onDrop(card, target.position)
              }
            }}
          >
            <mesh
              onPointerEnter={affordance.onPointerEnter}
              onPointerLeave={affordance.onPointerLeave}
              onPointerDown={affordance.onPointerDown}
            >
              <planeGeometry args={[layout.cardW + 0.04, 0.08]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </Handle>
        </group>
      </group>
    </HandleTarget>
  )
}

/**
 * DetachedCardItem: An independent, floating 3D document window in spatial room
 */
function DetachedCardItem({
  card,
  selected,
  onSelect,
  onDrop,
  onArchive,
  onDiscard,
  onDragMove,
}: {
  card: CardType
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
  const [capsuleVisible, setCapsuleVisible] = useState(false)
  const affordance = useSpatialAffordance(groupRef)
  const toggleFavorite = useWorkspace((s) => s.toggleFavorite)
  const reattachCard = useWorkspace((s) => s.reattachCard)
  const updateCardTransform = useWorkspace((s) => s.updateCardTransform)

  // Initialize detached transform once on mount
  useEffect(() => {
    if (groupRef.current) {
      const init = card.position || [0, layout.carouselY, -0.9]
      groupRef.current.position.set(init[0], init[1], init[2])
      if (card.rotation) {
        groupRef.current.rotation.set(card.rotation[0], card.rotation[1], card.rotation[2])
      }
    }
  }, [])

  return (
    <HandleTarget targetRef={groupRef}>
      <group ref={groupRef}>
        {/* Spatial Depth Shadow */}
        <mesh position={[0, -0.01, -0.006]}>
          <planeGeometry args={[layout.cardW + 0.02, layout.cardH + 0.02]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
        </mesh>

        {/* Floating Contextual Actions Capsule (Acoplar, Orientar, Cerrar) */}
        <group position={[0, layout.cardH / 2 + 0.045, 0.02]}>
          <SpatialCapsule
            targetRef={groupRef}
            title={card.title.slice(0, 16)}
            visible={capsuleVisible || hovered}
            isDetached={true}
            onReattach={() => reattachCard(card.id)}
            onClose={() => onDiscard(card)}
            onDismiss={() => setCapsuleVisible(false)}
          />
        </group>

        <UiRoot width={CARD_W} height={CARD_H} anchorY="center" pixelSize={PIXEL} alignItems="center" justifyContent="center">
          <Container
            width={CARD_W}
            height={CARD_H}
            overflow="hidden"
            backgroundColor="rgba(15, 23, 42, 0.92)"
            borderColor={selected ? color.borderActive : hovered ? color.borderHover : 'rgba(14, 165, 233, 0.5)'}
            borderTopWidth={2}
            borderBottomWidth={2}
            borderLeftWidth={2}
            borderRightWidth={2}
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
            onClick={() => {
              setCapsuleVisible(true)
              onSelect()
            }}
            onHoverChange={(h) => {
              setHovered(h)
              if (h) setCapsuleVisible(true)
            }}
            cursor="pointer"
          >
            {/* Top Specular Edge Glint */}
            <Container
              positionType="absolute"
              positionTop={0}
              positionLeft={14}
              positionRight={14}
              height={1}
              backgroundColor={color.accent}
            />

            {/* Header: Detached Badge + Favorite Heart */}
            <Container flexDirection="row" alignItems="center" justifyContent="space-between" width="100%" marginBottom={12}>
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
                backgroundColor="rgba(14, 165, 233, 0.18)"
              >
                <Container width={6} height={6} borderTopLeftRadius={3} borderTopRightRadius={3} borderBottomLeftRadius={3} borderBottomRightRadius={3} backgroundColor={color.accent} />
                <Text fontSize={typeScale.micro} fontWeight={700} color={color.accent} letterSpacing={0.8}>
                  {cleanText(`VENTANA LIBRE · ${card.badge}`)}
                </Text>
              </Container>

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
            </Container>

            <Text fontSize={14} fontWeight={700} color={color.cardTextPrimary} lineHeight={1.3} marginBottom={4}>
              {cleanText(card.title)}
            </Text>

            <Container width={36} height={3.5} borderTopLeftRadius={2} borderTopRightRadius={2} borderBottomLeftRadius={2} borderBottomRightRadius={2} backgroundColor={color.accent} marginBottom={8} />

            <Container width="100%" flexGrow={1} marginBottom={8}>
              <Text fontSize={11} color={color.cardTextSecondary} lineHeight={1.4}>
                {cleanText(card.summary)}
              </Text>
            </Container>

            {/* Bottom Actions Bar */}
            <Container
              positionType="absolute"
              positionBottom={8}
              width="100%"
              height={24}
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              gapColumn={8}
              cursor="grab"
              onHoverChange={setBarHovered}
            >
              <Container
                cursor="pointer"
                width={20}
                height={20}
                borderTopLeftRadius={10}
                borderTopRightRadius={10}
                borderBottomLeftRadius={10}
                borderBottomRightRadius={10}
                backgroundColor={barHovered ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.08)'}
                alignItems="center"
                justifyContent="center"
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive(card)
                }}
              >
                <MinusIcon width={10} color={color.cardTextPrimary} />
              </Container>

              <Container
                cursor="pointer"
                width={20}
                height={20}
                borderTopLeftRadius={10}
                borderTopRightRadius={10}
                borderBottomLeftRadius={10}
                borderBottomRightRadius={10}
                backgroundColor={barHovered ? 'rgba(244,63,94,0.22)' : 'rgba(0,0,0,0.08)'}
                alignItems="center"
                justifyContent="center"
                onClick={(e) => {
                  e.stopPropagation()
                  onDiscard(card)
                }}
              >
                <XIcon width={10} color={color.danger} />
              </Container>

              <Container
                width={barHovered ? 72 : 46}
                height={5}
                borderTopLeftRadius={2.5}
                borderTopRightRadius={2.5}
                borderBottomLeftRadius={2.5}
                borderBottomRightRadius={2.5}
                backgroundColor={barHovered ? color.accent : 'rgba(255,255,255,0.35)'}
              />
            </Container>
          </Container>
        </UiRoot>

        {/* Unified Movement Helper Pill (Revealed on 3s dwell hover, grip button squeeze, or proximity) */}
        <SpatialAffordancePill
          label="MOVER TARJETA"
          visible={affordance.visible}
          isDragging={affordance.isDragging}
          dwellProgress={affordance.dwellProgress}
          yOffset={-layout.cardH / 2 - 0.035}
          width={0.16}
        />

        {/* Two-Handed Generous Grab Handle for Detached Card (Translate, Rotate & Scale) */}
        <group position={[0, -layout.cardH / 2 + 0.025, 0.025]}>
          <Handle
            targetRef={groupRef}
            translate
            scale={true}
            rotate={true}
            multitouch={true}
            filter={canStartDrag}
            apply={(state, target) => {
              if (state.first) {
                dragging.current = true
                affordance.setIsDragging(true)
              }
              target.position.copy(state.current.position)
              target.rotation.copy(state.current.rotation)
              target.scale.copy(state.current.scale)
              onDragMove(card, state.current.position)
              if (state.last) {
                dragging.current = false
                affordance.setIsDragging(false)
                onDragMove(card, null)
                onDrop(card, target.position)
                updateCardTransform(card.id, [target.position.x, target.position.y, target.position.z], [target.rotation.x, target.rotation.y, target.rotation.z])
              }
            }}
          >
            <mesh
              userData={{ [GRAB_USERDATA]: true }}
              onPointerEnter={affordance.onPointerEnter}
              onPointerLeave={affordance.onPointerLeave}
              onPointerDown={affordance.onPointerDown}
            >
              <planeGeometry args={[layout.cardW + 0.04, 0.08]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </Handle>
        </group>
      </group>
    </HandleTarget>
  )
}

function CarouselChevron({
  direction,
  onClick,
  position,
  rotation,
}: {
  direction: 'left' | 'right'
  onClick: () => void
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <group position={position} rotation={rotation}>
      <UiRoot width={px(0.065)} height={px(0.065)} anchorY="center" pixelSize={PIXEL} alignItems="center" justifyContent="center">
        <Container
          cursor="pointer"
          width={46}
          height={46}
          borderTopLeftRadius={23}
          borderTopRightRadius={23}
          borderBottomLeftRadius={23}
          borderBottomRightRadius={23}
          backgroundColor={hovered ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.88)'}
          borderColor={hovered ? color.borderHover : 'rgba(255, 255, 255, 0.28)'}
          borderTopWidth={1.5}
          borderBottomWidth={1}
          borderLeftWidth={1}
          borderRightWidth={1}
          alignItems="center"
          justifyContent="center"
          onClick={onClick}
          onHoverChange={setHovered}
        >
          {direction === 'left' ? (
            <ChevronLeftIcon width={20} color={hovered ? color.accent : color.textPrimary} />
          ) : (
            <ChevronRightIcon width={20} color={hovered ? color.accent : color.textPrimary} />
          )}
        </Container>
      </UiRoot>
    </group>
  )
}

export function Carousel() {
  const cards = useWorkspace((s) => s.cards)
  const selectedId = useWorkspace((s) => s.selectedId)
  const select = useWorkspace((s) => s.select)
  const spawn = useWorkspace((s) => s.spawnSpotlight)
  const archive = useWorkspace((s) => s.archive)
  const discard = useWorkspace((s) => s.discard)
  const detachCard = useWorkspace((s) => s.detachCard)
  const archivePosition = useWorkspace((s) => s.archivePosition)
  const trashPosition = useWorkspace((s) => s.trashPosition)

  const carouselGroupRef = useRef<Group>(null)
  const carouselAffordance = useSpatialAffordance(carouselGroupRef)
  const [carouselBarHovered, setCarouselBarHovered] = useState(false)
  const [carouselCapsuleVisible, setCarouselCapsuleVisible] = useState(false)

  const [slideOffset, setSlideOffset] = useState(0)
  const [activeDragPos, setActiveDragPos] = useState<Vector3 | null>(null)

  const archivePos = useMemo(
    () => new Vector3(archivePosition[0], archivePosition[1], archivePosition[2]),
    [archivePosition]
  )
  const trashPos = useMemo(
    () => new Vector3(trashPosition[0], trashPosition[1], trashPosition[2]),
    [trashPosition]
  )

  const arcCards = useMemo(() => cards.filter((c) => !c.detached), [cards])
  const detachedCards = useMemo(() => cards.filter((c) => c.detached), [cards])

  const handleDrop = (card: CardType, position: Vector3) => {
    if (card.isSpotlight) return

    // Check if dropped near Archive
    if (position.distanceTo(archivePos) < 0.38) {
      archive(card.id, [position.x, position.y, position.z])
      return
    }

    // Check if dropped near Trash
    if (position.distanceTo(trashPos) < 0.38) {
      discard(card.id)
      return
    }

    // Check if card was dragged far out of the carousel arc into free space
    const slotIdx = arcCards.findIndex((c) => c.id === card.id)
    if (slotIdx >= 0) {
      const slot = arcSlot(slotIdx, arcCards.length, slideOffset)
      const slotPos = new Vector3(slot.x, layout.carouselY, slot.z)
      if (position.distanceTo(slotPos) > 0.45) {
        detachCard(card.id, [position.x, position.y, position.z])
      }
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
      {/* Movable Arc Group (Entire Collection) */}
      <HandleTarget targetRef={carouselGroupRef}>
        <group ref={carouselGroupRef}>
          {/* Top Header Rail for Movable Carousel Group */}
          <group position={[0, layout.carouselY + layout.cardH / 2 + 0.08, ARC_Z + 0.12]}>
            <UiRoot width={px(0.42)} height={px(0.055)} anchorY="center" pixelSize={PIXEL} alignItems="center" justifyContent="center">
              <Container
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gapColumn={8}
                paddingLeft={14}
                paddingRight={14}
                paddingTop={4}
                paddingBottom={4}
                borderTopLeftRadius={radius.pill}
                borderTopRightRadius={radius.pill}
                borderBottomLeftRadius={radius.pill}
                borderBottomRightRadius={radius.pill}
                backgroundColor={carouselBarHovered ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.88)'}
                borderColor={carouselBarHovered ? color.borderHover : 'rgba(255, 255, 255, 0.22)'}
                borderTopWidth={1.5}
                borderBottomWidth={1}
                borderLeftWidth={1}
                borderRightWidth={1}
                panelMaterialClass="glass"
                cursor="grab"
                onHoverChange={(h) => {
                  setCarouselBarHovered(h)
                  if (h) setCarouselCapsuleVisible(true)
                }}
                onClick={() => setCarouselCapsuleVisible(true)}
              >
                <Container width={6} height={6} borderTopLeftRadius={3} borderTopRightRadius={3} borderBottomLeftRadius={3} borderBottomRightRadius={3} backgroundColor={color.accent} />
                <Text fontSize={typeScale.micro} fontWeight={700} color={color.textPrimary} letterSpacing={0.8}>
                  {cleanText(`CARRUSEL DE FUENTES (${arcCards.length})`)}
                </Text>
              </Container>
            </UiRoot>

            {/* Contextual Capsule for Carousel Rail */}
            <group position={[0, 0.05, 0.02]}>
              <SpatialCapsule
                targetRef={carouselGroupRef}
                title="CARRUSEL"
                visible={carouselCapsuleVisible || carouselBarHovered}
                onDismiss={() => setCarouselCapsuleVisible(false)}
              />
            </group>

            {/* Unified Movement Helper Pill (Revealed on 3s dwell hover, grip button squeeze, or proximity) */}
            <SpatialAffordancePill
              label="MOVER CARRUSEL (GRUPO)"
              visible={carouselAffordance.visible}
              isDragging={carouselAffordance.isDragging}
              dwellProgress={carouselAffordance.dwellProgress}
              yOffset={0.05}
              width={0.24}
            />

            {/* Carousel Rail Grab Handle (Two-Handed Translate, Rotate & Scale whole arc) */}
            <Handle
              targetRef={carouselGroupRef}
              translate
              rotate={true}
              scale={true}
              multitouch={true}
              apply={(state, target) => {
                if (state.first) carouselAffordance.setIsDragging(true)
                target.position.copy(state.current.position)
                target.rotation.copy(state.current.rotation)
                target.scale.copy(state.current.scale)
                if (state.last) carouselAffordance.setIsDragging(false)
              }}
            >
              <mesh
                onPointerEnter={carouselAffordance.onPointerEnter}
                onPointerLeave={carouselAffordance.onPointerLeave}
                onPointerDown={carouselAffordance.onPointerDown}
              >
                <planeGeometry args={[0.42, 0.06]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            </Handle>
          </group>

          {/* Cards in arc */}
          {arcCards.map((card, i) => (
            <CardItem
              key={card.id}
              card={card}
              index={i}
              count={arcCards.length}
              offsetIndex={slideOffset}
              selected={card.id === selectedId}
              onSelect={() => {
                if (card.isSpotlight) {
                  spawn()
                } else {
                  select(card.id)
                  // Smoothly bring selected card to center of the arc
                  const mid = (arcCards.length - 1) / 2
                  setSlideOffset(mid - i)
                }
              }}
              onDrop={handleDrop}
              onArchive={(c) => archive(c.id)}
              onDiscard={(c) => discard(c.id)}
              onDragMove={(_, pos) => setActiveDragPos(pos ? pos.clone() : null)}
            />
          ))}

          {/* Modern Frosted Glass Navigation Chevrons `<` and `>` */}
          {arcCards.length > 2 && (
            <>
              <CarouselChevron
                direction="left"
                position={[-0.58, layout.carouselY, -1.16]}
                rotation={[0, 0.35, 0]}
                onClick={() => setSlideOffset((o) => o + 1)}
              />
              <CarouselChevron
                direction="right"
                position={[0.58, layout.carouselY, -1.16]}
                rotation={[0, -0.35, 0]}
                onClick={() => setSlideOffset((o) => o - 1)}
              />
            </>
          )}
        </group>
      </HandleTarget>

      {/* Detached Floating Cards (Independent 3D Windows outside Carousel) */}
      {detachedCards.map((card) => (
        <DetachedCardItem
          key={card.id}
          card={card}
          selected={card.id === selectedId}
          onSelect={() => select(card.id)}
          onDrop={handleDrop}
          onArchive={(c) => archive(c.id)}
          onDiscard={(c) => discard(c.id)}
          onDragMove={(_, pos) => setActiveDragPos(pos ? pos.clone() : null)}
        />
      ))}

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
    </group>
  )
}
