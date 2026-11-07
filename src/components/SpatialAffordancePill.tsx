import { Container, Text } from '@react-three/uikit'
import { color } from '../theme'
import { cleanText, UiRoot } from './Ui'
import { PIXEL, px } from './Panel'

export type SpatialAffordancePillProps = {
  label: string
  visible: boolean
  isDragging?: boolean
  dwellProgress?: number
  accentColor?: string
  yOffset?: number
  width?: number
}

export function SpatialAffordancePill({
  label,
  visible,
  isDragging = false,
  dwellProgress = 0,
  accentColor = color.accent,
  yOffset = -0.05,
  width = 0.16,
}: SpatialAffordancePillProps) {
  if (!visible && dwellProgress <= 0.05) return null

  const opacity = visible ? 1 : Math.max(0, dwellProgress)
  const isHolding = isDragging

  return (
    <group position={[0, yOffset, 0.035]}>
      <UiRoot width={px(width)} height={px(0.032)} anchorY="center" pixelSize={PIXEL}>
        <Container
          height={24}
          paddingX={10}
          borderRadius={12}
          backgroundColor={isHolding ? 'rgba(14, 165, 233, 0.35)' : 'rgba(10, 15, 29, 0.88)'}
          borderColor={isHolding ? '#38bdf8' : accentColor}
          borderTopWidth={1.5}
          borderBottomWidth={1}
          borderLeftWidth={1}
          borderRightWidth={1}
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          gapColumn={6}
          opacity={opacity}
          cursor="grab"
        >
          {/* Status glow dot */}
          <Container
            width={6}
            height={6}
            borderRadius={3}
            backgroundColor={isHolding ? '#38bdf8' : accentColor}
          />
          <Text
            fontSize={9}
            fontWeight={700}
            color={isHolding ? '#e0f2fe' : color.textPrimary}
            letterSpacing={0.6}
          >
            {cleanText(label)}
          </Text>
          {dwellProgress > 0 && !visible && (
            <Text fontSize={8} fontWeight={600} color={accentColor}>
              {`${Math.round(dwellProgress * 100)}%`}
            </Text>
          )}
        </Container>
      </UiRoot>
    </group>
  )
}
