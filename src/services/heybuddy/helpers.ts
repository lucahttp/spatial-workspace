/** @module heybuddy/helpers */

/**
 * Check if an object is 'empty'.
 */
export const isEmpty = (o: unknown): boolean => {
  return (
    o === null ||
    o === undefined ||
    o === '' ||
    o === 'null' ||
    (Array.isArray(o) && o.length === 0) ||
    (typeof o === 'object' &&
      o.constructor.name === 'Object' &&
      Object.getOwnPropertyNames(o).length === 0)
  )
}

/**
 * Returns a promise that resolves after a given number of milliseconds.
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
