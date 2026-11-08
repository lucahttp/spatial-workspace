/**
 * Shared spatial interaction contract.
 *
 * The XR ray pointer is bound to `select` (TRIGGER) and the grip pointer
 * (added below) to `squeeze` (GRIP). With this we get the visionOS / PICO-OS
 * behaviour the user asked for:
 *
 *     GRIP     -> grab the pointed object and move it
 *     TRIGGER  -> activate a uikit control
 */

/** userData flag marking the invisible grab colliders (Handle meshes). */
export const GRAB_USERDATA = 'spatialGrab'

export function isGrabTarget(object: unknown): boolean {
  const ud = (object as { userData?: Record<string, unknown> } | null)?.userData
  return !!ud && ud[GRAB_USERDATA] === true
}

/** Pointer-level filter: the grip ray only ever intersects grab colliders. */
export function isGrabTargetFilter(object: unknown): boolean {
  return isGrabTarget(object)
}

/** Handle-level filter: only the grip ray (XR) or the mouse (desktop) may start a drag. */
export function canStartDrag(event: { pointerType?: string; pointerState?: { type?: string } }): boolean {
  const type = event?.pointerType
  if (type === 'grip-ray') return true
  if (type === 'screen-mouse') return true
  if (type === 'grab') return true
  // Hand tracking has no separate button: pinch = drag keeps the existing
  // manipulation model without making the hand's ray steal the trigger.
  if (type === 'ray') return event?.pointerState?.type !== 'controller' && event?.pointerState?.type !== 'screenInput'
  return false
}
