import { Container, Text } from '@react-three/uikit'
import {
  CompassIcon,
  Maximize2Icon,
  Minimize2Icon,
  MoveIcon,
  RotateCwIcon,
  XIcon,
} from '@react-three/uikit-lucide'
import { useEffect, useRef, useState } from 'react'
import { Group, Vector3 } from 'three'
import { color, radius, type as typeScale } from '../theme'
import { px, PIXEL } from './Panel'
import { cleanText, UiRoot } from './Ui'

export type SpatialCapsuleProps = {
  /** Target ref to rotate towards camera */
  targetRef?: React.RefObject<Group | null>
  title?: string
  visible: boolean
  onClose?: () => void
  onMinimize?: () => void
  onDetach?: () => void
  onReattach?: () => void
  isDetached?: boolean
  autoHideDuration?: number
  onDismiss?: () => void
}

export function SpatialCapsule({
  targetRef,
  title,
  visible,
  onClose,
  onMinimize,
  onDetach,
  onReattach,
  isDetached,
  autoHideDuration = 2800,
  onDismiss,
}: SpatialCapsuleProps) {
  const [capsuleHovered, setCapsuleHovered] = useState(false)
  const [internalVisible, setInternalVisible] = useState(visible)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  // Auto-hide timeout management
  useEffect(() => {
    if (visible) {
      setInternalVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (!capsuleHovered) {
        timerRef.current = setTimeout(() => {
          setInternalVisible(false)
          onDismiss?.()
        }, autoHideDuration)
      }
    } else if (!capsuleHovered) {
      setInternalVisible(false)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [visible, capsuleHovered, autoHideDuration, onDismiss])

  // Face User / Camera action
  const faceUser = () => {
    if (!targetRef?.current) return
    const g = targetRef.current
    const worldPos = new Vector3()
    g.getWorldPosition(worldPos)
    // Find camera position in world space
    const cam = (window as any).__gl?.camera || (window as any).__scene?.parent?.camera
    if (cam) {
      const camPos = new Vector3()
      cam.getWorldPosition(camPos)
      const dx = camPos.x - worldPos.x
      const dz = camPos.z - worldPos.z
      const yaw = Math.atan2(dx, dz)
      g.rotation.y = yaw
    } else {
      // Default nudge towards center front
      g.rotation.y = Math.atan2(-worldPos.x, -worldPos.z)
    }
  }

  // Quick 15-degree yaw rotation nudge
  const rotateNudge = (deltaRad: number) => {
    if (!targetRef?.current) return
    targetRef.current.rotation.y += deltaRad
  }

  if (!internalVisible) return null

  return (
    <group position={[0, 0, 0.035]}>
      <UiRoot width={px(0.38)} height={px(0.065)} anchorY="center" pixelSize={PIXEL} alignItems="center" justifyContent="center">
        <Container
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          gapColumn={6}
          paddingLeft={10}
          paddingRight={10}
          paddingTop={4}
          paddingBottom={4}
          borderTopLeftRadius={radius.pill}
          borderTopRightRadius={radius.pill}
          borderBottomLeftRadius={radius.pill}
          borderBottomRightRadius={radius.pill}
          backgroundColor="rgba(15, 23, 42, 0.94)"
          borderColor={capsuleHovered ? color.borderHover : 'rgba(255, 255, 255, 0.28)'}
          borderTopWidth={1.5}
          borderBottomWidth={1}
          borderLeftWidth={1}
          borderRightWidth={1}
          panelMaterialClass="glass"
          onHoverChange={(h) => {
            setCapsuleHovered(h)
            if (h && timerRef.current) {
              clearTimeout(timerRef.current)
            }
          }}
        >
          {/* Title or Active Tooltip indicator */}
          <Container paddingRight={6} borderColor="rgba(255, 255, 255, 0.12)" borderRightWidth={1}>
            <Text fontSize={typeScale.micro} fontWeight={700} color={color.accent} letterSpacing={0.5}>
              {cleanText(activeTooltip || title || 'CONTROL')}
            </Text>
          </Container>

          {/* Action: Move / Grab indicator button */}
          <Container
            cursor="grab"
            width={24}
            height={24}
            borderTopLeftRadius={12}
            borderTopRightRadius={12}
            borderBottomLeftRadius={12}
            borderBottomRightRadius={12}
            backgroundColor="rgba(255, 255, 255, 0.08)"
            alignItems="center"
            justifyContent="center"
            onHoverChange={(h) => setActiveTooltip(h ? 'ARRASTRAR' : null)}
          >
            <MoveIcon width={12} color={color.textPrimary} />
          </Container>

          {/* Action: Face User (Align yaw with user view) */}
          <Container
            cursor="pointer"
            width={24}
            height={24}
            borderTopLeftRadius={12}
            borderTopRightRadius={12}
            borderBottomLeftRadius={12}
            borderBottomRightRadius={12}
            backgroundColor="rgba(255, 255, 255, 0.08)"
            alignItems="center"
            justifyContent="center"
            onClick={faceUser}
            onHoverChange={(h) => setActiveTooltip(h ? 'MIRAR A MI' : null)}
          >
            <CompassIcon width={12} color={color.accent} />
          </Container>

          {/* Action: Rotate Yaw Nudge (+15°) */}
          <Container
            cursor="pointer"
            width={24}
            height={24}
            borderTopLeftRadius={12}
            borderTopRightRadius={12}
            borderBottomLeftRadius={12}
            borderBottomRightRadius={12}
            backgroundColor="rgba(255, 255, 255, 0.08)"
            alignItems="center"
            justifyContent="center"
            onClick={() => rotateNudge(Math.PI / 12)}
            onHoverChange={(h) => setActiveTooltip(h ? 'GIRAR 15°' : null)}
          >
            <RotateCwIcon width={12} color={color.textDim} />
          </Container>

          {/* Action: Detach from Carousel or Reattach */}
          {onDetach && !isDetached && (
            <Container
              cursor="pointer"
              width={24}
              height={24}
              borderTopLeftRadius={12}
              borderTopRightRadius={12}
              borderBottomLeftRadius={12}
              borderBottomRightRadius={12}
              backgroundColor="rgba(124, 58, 237, 0.22)"
              alignItems="center"
              justifyContent="center"
              onClick={onDetach}
              onHoverChange={(h) => setActiveTooltip(h ? 'EXTRAER TARJETA' : null)}
            >
              <Maximize2Icon width={12} color={color.purple} />
            </Container>
          )}

          {onReattach && isDetached && (
            <Container
              cursor="pointer"
              width={24}
              height={24}
              borderTopLeftRadius={12}
              borderTopRightRadius={12}
              borderBottomLeftRadius={12}
              borderBottomRightRadius={12}
              backgroundColor="rgba(14, 165, 233, 0.22)"
              alignItems="center"
              justifyContent="center"
              onClick={onReattach}
              onHoverChange={(h) => setActiveTooltip(h ? 'ACOPLAR AL CARRUSEL' : null)}
            >
              <Minimize2Icon width={12} color={color.accent} />
            </Container>
          )}

          {/* Action: Minimize */}
          {onMinimize && (
            <Container
              cursor="pointer"
              width={24}
              height={24}
              borderTopLeftRadius={12}
              borderTopRightRadius={12}
              borderBottomLeftRadius={12}
              borderBottomRightRadius={12}
              backgroundColor="rgba(251, 191, 36, 0.18)"
              alignItems="center"
              justifyContent="center"
              onClick={onMinimize}
              onHoverChange={(h) => setActiveTooltip(h ? 'MINIMIZAR' : null)}
            >
              <Minimize2Icon width={12} color="#fbbf24" />
            </Container>
          )}

          {/* Action: Close */}
          {onClose && (
            <Container
              cursor="pointer"
              width={24}
              height={24}
              borderTopLeftRadius={12}
              borderTopRightRadius={12}
              borderBottomLeftRadius={12}
              borderBottomRightRadius={12}
              backgroundColor="rgba(244, 63, 94, 0.22)"
              alignItems="center"
              justifyContent="center"
              onClick={onClose}
              onHoverChange={(h) => setActiveTooltip(h ? 'CERRAR' : null)}
            >
              <XIcon width={12} color="#fb7185" />
            </Container>
          )}
        </Container>
      </UiRoot>
    </group>
  )
}
