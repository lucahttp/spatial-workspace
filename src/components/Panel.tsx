import { Handle, HandleTarget } from '@react-three/handle'
import { Container, Text } from '@react-three/uikit'
import { useEffect, useRef, useState } from 'react'
import { Group } from 'three'
import { color, radius, type as typeScale } from '../theme'
import { cleanText, UiRoot } from './Ui'
import { SpatialCapsule } from './SpatialCapsule'

export const PIXEL = 0.0014
export const px = (metres: number) => Math.round(metres / PIXEL)

const BAR_H = 32
const BAR_OFFSET = 0.032

export type PanelProps = {
  title?: string
  subtitle?: string
  accent?: string
  width: number
  height: number
  position: [number, number, number]
  rotation?: [number, number, number]
  onMinimize?: () => void
  onClose?: () => void
  bar?: boolean
  children?: React.ReactNode
}

export function Panel({
  title,
  subtitle,
  accent = color.accent,
  width,
  height,
  position,
  rotation = [0, 0, 0],
  onMinimize,
  onClose,
  bar = true,
  children,
}: PanelProps) {
  const groupRef = useRef<Group>(null)
  const [barHovered, setBarHovered] = useState(false)
  const [panelHovered, setPanelHovered] = useState(false)
  const [capsuleVisible, setCapsuleVisible] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Initialize group transform once on mount to avoid R3F resetting position on re-renders
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2])
      groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2])
    }
  }, [])

  const w = px(width)
  const h = px(height)

  return (
    <HandleTarget targetRef={groupRef}>
      <group ref={groupRef}>
        {/* Realistic visionOS Window Shadow */}
        <mesh position={[0, -0.012, -0.008]}>
          <planeGeometry args={[width + 0.03, height + 0.03]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={isDragging ? 0.42 : panelHovered ? 0.32 : 0.18}
            depthWrite={false}
          />
        </mesh>

        <UiRoot width={w} height={h} anchorY="center" pixelSize={PIXEL} alignItems="center" justifyContent="center">
          <Container
            width={w}
            height={h}
            overflow="hidden"
            backgroundColor={color.glassPanel}
            borderColor={panelHovered ? color.borderHover : color.borderSubtle}
            borderTopWidth={1.5}
            borderBottomWidth={1}
            borderLeftWidth={1}
            borderRightWidth={1}
            borderBend={0.5}
            borderTopLeftRadius={radius.window}
            borderTopRightRadius={radius.window}
            borderBottomLeftRadius={radius.window}
            borderBottomRightRadius={radius.window}
            panelMaterialClass="glass"
            flexDirection="column"
            alignItems="flex-start"
            paddingTop={14}
            paddingBottom={bar ? 44 : 14}
            paddingLeft={18}
            paddingRight={18}
            onHoverChange={(h) => {
              setPanelHovered(h)
              if (h) setCapsuleVisible(true)
            }}
            onClick={() => setCapsuleVisible(true)}
          >
            {/* Top Specular Edge Glint (Refractive Glass Highlight) */}
            <Container
              positionType="absolute"
              positionTop={0}
              positionLeft={20}
              positionRight={20}
              height={1}
              backgroundColor={color.borderSpecular}
            />

            {/* VisionOS Floating Frosted Header Bar */}
            {title && (
              <Container
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                width="100%"
                paddingTop={8}
                paddingBottom={8}
                paddingLeft={12}
                paddingRight={12}
                marginBottom={12}
                borderTopLeftRadius={radius.button}
                borderTopRightRadius={radius.button}
                borderBottomLeftRadius={radius.button}
                borderBottomRightRadius={radius.button}
                backgroundColor={color.glassPanelHeader}
                borderColor="rgba(255, 255, 255, 0.08)"
                borderTopWidth={1}
                borderBottomWidth={1}
                borderLeftWidth={1}
                borderRightWidth={1}
                flexShrink={0}
              >
                <Container flexDirection="row" alignItems="center" gapColumn={10}>
                  {/* Glowing Status Dot */}
                  <Container
                    width={8}
                    height={8}
                    borderTopLeftRadius={4}
                    borderTopRightRadius={4}
                    borderBottomLeftRadius={4}
                    borderBottomRightRadius={4}
                    backgroundColor={accent}
                  />
                  <Text fontSize={typeScale.section} fontWeight={700} color={color.textPrimary} letterSpacing={0.2}>
                    {cleanText(title)}
                  </Text>
                  {subtitle && (
                    <Text fontSize={typeScale.caption} color={color.textDim} fontWeight={500}>
                      {cleanText(subtitle)}
                    </Text>
                  )}
                </Container>

                {/* visionOS / macOS Style Interactive Control Lights */}
                <Container flexDirection="row" alignItems="center" gapColumn={8}>
                  {onClose && (
                    <Container
                      cursor="pointer"
                      width={11}
                      height={11}
                      borderTopLeftRadius={5.5}
                      borderTopRightRadius={5.5}
                      borderBottomLeftRadius={5.5}
                      borderBottomRightRadius={5.5}
                      backgroundColor="#fb7185"
                      borderColor="#f43f5e"
                      borderTopWidth={1}
                      borderBottomWidth={1}
                      borderLeftWidth={1}
                      borderRightWidth={1}
                      onClick={onClose}
                    />
                  )}
                  {onMinimize && (
                    <Container
                      cursor="pointer"
                      width={11}
                      height={11}
                      borderTopLeftRadius={5.5}
                      borderTopRightRadius={5.5}
                      borderBottomLeftRadius={5.5}
                      borderBottomRightRadius={5.5}
                      backgroundColor="#fbbf24"
                      borderColor="#f59e0b"
                      borderTopWidth={1}
                      borderBottomWidth={1}
                      borderLeftWidth={1}
                      borderRightWidth={1}
                      onClick={onMinimize}
                    />
                  )}
                  <Container
                    width={11}
                    height={11}
                    borderTopLeftRadius={5.5}
                    borderTopRightRadius={5.5}
                    borderBottomLeftRadius={5.5}
                    borderBottomRightRadius={5.5}
                    backgroundColor="#34d399"
                    borderColor="#10b981"
                    borderTopWidth={1}
                    borderBottomWidth={1}
                    borderLeftWidth={1}
                    borderRightWidth={1}
                  />
                </Container>
              </Container>
            )}

            {children}
          </Container>

          {/* Floating VisionOS / PICO OS Window Grab Bar */}
          {bar && (
            <Container
              positionType="absolute"
              positionBottom={6}
              width="100%"
              height={BAR_H}
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              gapColumn={10}
              cursor="grab"
              onHoverChange={setBarHovered}
            >
              {/* Central Grab Pill */}
              <Container
                width={isDragging ? 96 : barHovered ? 78 : 46}
                height={6}
                borderTopLeftRadius={3}
                borderTopRightRadius={3}
                borderBottomLeftRadius={3}
                borderBottomRightRadius={3}
                backgroundColor={
                  isDragging
                    ? accent
                    : barHovered
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(255, 255, 255, 0.35)'
                }
              />
            </Container>
          )}
        </UiRoot>

        {/* Auto-Hiding Contextual Actions Capsule (Cerrar, Minimizar, Mover, Orientar) */}
        <group position={[0, height / 2 + 0.05, 0.02]}>
          <SpatialCapsule
            targetRef={groupRef}
            title={title}
            visible={capsuleVisible || panelHovered}
            onClose={onClose}
            onMinimize={onMinimize}
            onDismiss={() => setCapsuleVisible(false)}
          />
        </group>

        {/* Generous Bottom Grab Handle Mesh for XR Hands & Laser Raycast */}
        {bar && (
          <group position={[0, -height / 2 + BAR_OFFSET, 0.025]}>
            <Handle
              targetRef={groupRef}
              translate
              scale={false}
              rotate={true}
              multitouch={true}
              apply={(state, target) => {
                if (state.first) setIsDragging(true)
                target.position.copy(state.current.position)
                target.rotation.copy(state.current.rotation)
                if (state.last) setIsDragging(false)
              }}
            >
              <mesh>
                <planeGeometry args={[Math.max(width * 0.9, 0.45), 0.09]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            </Handle>
          </group>
        )}

        {/* Generous Top Header Grab Handle Mesh for natural window moving and rotation */}
        {title && (
          <group position={[0, height / 2 - 0.025, 0.025]}>
            <Handle
              targetRef={groupRef}
              translate
              scale={false}
              rotate={true}
              multitouch={true}
              apply={(state, target) => {
                if (state.first) setIsDragging(true)
                target.position.copy(state.current.position)
                target.rotation.copy(state.current.rotation)
                if (state.last) setIsDragging(false)
              }}
            >
              <mesh>
                <planeGeometry args={[Math.max(width * 0.9, 0.45), 0.07]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            </Handle>
          </group>
        )}
      </group>
    </HandleTarget>
  )
}
