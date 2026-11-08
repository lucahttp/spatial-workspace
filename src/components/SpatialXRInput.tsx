import { useRef } from 'react'
import {
  usePointerXRInputSourceEvents,
  useRayPointer,
  useXRInputSourceStates,
  XRSpace,
} from '@react-three/xr'
import { isGrabTargetFilter } from '../interaction'

/** Per-input-source grab ray, registers under the nearest CombinedPointer. */
function GripRayPointer({ state }: { state: any }) {
  const ref = useRef<any>(null)
  const pointer = useRayPointer(
    ref,
    state,
    {
      minDistance: 0.2,
      filter: (object: unknown) => isGrabTargetFilter(object),
    },
    'grip-ray'
  )

  // Bind squeeze (grip) to the ray's down / up events instead of select.
  usePointerXRInputSourceEvents(pointer, state.inputSource, 'squeeze', state.events)

  return <XRSpace ref={ref} space={state.inputSource.targetRaySpace} />
}

/** Mounts a grip-bound ray pointer for every controller input source. */
export function GripRayPointers() {
  const sources = useXRInputSourceStates()
  const controllers = sources.filter((s) => s.type === 'controller')

  return (
    <>
      {controllers.map((state) => (
        <GripRayPointer key={state.id} state={state} />
      ))}
    </>
  )
}

export default GripRayPointers
