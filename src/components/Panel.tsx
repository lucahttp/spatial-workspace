import { Handle, HandleTarget } from '@react-three/handle'
import { Container, Text } from '@react-three/uikit'
import { useRef, useState } from 'react'
import { Group } from 'three'
import { color, radius, type as typeScale } from '../theme'
import { cleanText, UiRoot } from './Ui'

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

  const w = px(width)
  const h = px(height)

  return (
    <HandleTarget targetRef={groupRef}>
      <group ref={groupRef} position={position} rotation={rotation}>
        {/* Realistic visionOS Window Shadow */}
        <mesh position={[0, -0.012, -0.008]}>
          <planeGeometry args={[width + 0.03, height + 0.03]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={panelHovered ? 0.32 : 0.18}
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
            onHoverChange={setPanelHovered}
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

          {/* Floating PICO OS 5 Grab Bar */}
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
              onHoverChange={setBarHovered}
            >
              {/* Central Grab Pill */}
              <Container
                width={barHovered ? 68 : 42}
                height={5}
                borderTopLeftRadius={2.5}
                borderTopRightRadius={2.5}
                borderBottomLeftRadius={2.5}
                borderBottomRightRadius={2.5}
                backgroundColor={barHovered ? accent : 'rgba(255,255,255,0.30)'}
              />
            </Container>
          )}
        </UiRoot>

        {/* Grab Handle Mesh for XR Laser Raycast */}
        {bar && (
          <group position-y={-height / 2 + BAR_OFFSET}>
            <Handle targetRef={groupRef} translate scale={false} rotate={false} multitouch={false}>
              <mesh>
                <planeGeometry args={[0.16, 0.05]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            </Handle>
          </group>
        )}
      </group>
    </HandleTarget>
  )
}
