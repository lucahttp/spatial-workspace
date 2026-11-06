import type { WebGLRenderer } from 'three'

/**
 * Bridge to the renderer so code outside the Canvas (the Enter AR/VR buttons)
 * can reach `gl.xr` — needed to fall back from `local-floor` to `local` on
 * browsers that only grant the floor-less reference space (Pico Neo 3).
 */
export const glRef: { current: WebGLRenderer | null } = { current: null }
