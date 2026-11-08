import { useFrame } from '@react-three/fiber'
import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { Object3D, Vector3 } from 'three'

export type SpatialAffordanceOptions = {
  dwellMs?: number // Default: 1000ms
  proximityDistance?: number // Default: 0.9m
}

export type SpatialAffordanceState = {
  visible: boolean
  isHovered: boolean
  isDwell: boolean
  isProximity: boolean
  isDragging: boolean
  dwellProgress: number // 0 to 1
  setIsDragging: (dragging: boolean) => void
  onPointerEnter: () => void
  onPointerLeave: () => void
  onPointerDown: (e?: any) => void
  onPointerUp: () => void
}

/**
 * Unified affordance rule for all spatial objects:
 * The movement / action helper appears ONLY when:
 * 1. User points with laser / cursor continuously for > 1 second (dwell), OR
 * 2. User presses the side trigger / grip button or initiates dragging, OR
 * 3. User brings their hand or controller physically close to the object (< 0.9m).
 *
 * The dwell timer keeps its progress when the pointer leaves briefly (micro
 * jitter of an XR ray would otherwise reset it every frame) and decays slowly.
 */
export function useSpatialAffordance(
  targetRef: RefObject<Object3D | null>,
  options: SpatialAffordanceOptions = {}
): SpatialAffordanceState {
  const dwellMs = options.dwellMs ?? 1000
  const proximityDist = options.proximityDistance ?? 0.9

  const [isHovered, setIsHovered] = useState(false)
  const [isDwell, setIsDwell] = useState(false)
  const [isProximity, setIsProximity] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dwellProgress, setDwellProgress] = useState(0)

  const hoverStartRef = useRef<number | null>(null)
  const hoverTotalRef = useRef(0)
  const targetWorldPos = useRef(new Vector3())

  // Dwell timer animation and proximity check per frame
  useFrame(({ camera }) => {
    // 1. Proximity check
    if (targetRef.current) {
      targetRef.current.getWorldPosition(targetWorldPos.current)
      const dist = camera.position.distanceTo(targetWorldPos.current)
      const near = dist > 0.05 && dist < proximityDist
      if (near !== isProximity) {
        setIsProximity(near)
      }
    }

    // 2. Dwell progress — decays instead of resetting so XR ray jitter
    //    does not restart the countdown from zero.
    if (isHovered && hoverStartRef.current) {
      const elapsed = Date.now() - hoverStartRef.current
      hoverTotalRef.current = elapsed
      const progress = Math.min(1, elapsed / dwellMs)
      setDwellProgress(progress)
      if (progress >= 1 && !isDwell) {
        setIsDwell(true)
      }
    } else if (!isHovered && dwellProgress > 0) {
      // Decay over ~2s instead of snapping to zero
      hoverTotalRef.current = Math.max(0, hoverTotalRef.current - dwellMs * 0.5)
      const progress = Math.min(1, hoverTotalRef.current / dwellMs)
      setDwellProgress(progress)
      if (progress <= 0 && isDwell) {
        setIsDwell(false)
      }
    }
  })

  const onPointerEnter = useCallback(() => {
    setIsHovered(true)
    // Resume from where we left off, but restart the clock if enough time passed
    if (hoverStartRef.current == null) {
      hoverStartRef.current = Date.now() - hoverTotalRef.current
    }
  }, [])

  const onPointerLeave = useCallback(() => {
    setIsHovered(false)
    setIsDwell(false)
    // Keep hoverStartRef so the decay can continue; total is preserved
  }, [])

  const onPointerDown = useCallback((e?: any) => {
    // Check if grip button / secondary click was pressed
    if (e?.button === 1 || e?.button === 2 || e?.nativeEvent?.buttons === 4) {
      setIsDragging(true)
    }
  }, [])

  const onPointerUp = useCallback(() => {
    // dragging end handled by Handle or pointer up
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      hoverStartRef.current = null
    }
  }, [])

  const visible = isDwell || isDragging || isProximity

  return {
    visible,
    isHovered,
    isDwell,
    isProximity,
    isDragging,
    dwellProgress,
    setIsDragging,
    onPointerEnter,
    onPointerLeave,
    onPointerDown,
    onPointerUp,
  }
}
