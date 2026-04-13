/**
 * D₈ Dihedral Group D-pad Navigation.
 *
 * Physical Roku D-pad inputs are mapped to D₈ generators:
 *   R⁸ = 1,  S² = 1,  SRS = R⁻¹
 *
 * Navigation states n ∈ {2, 3, 4, 5, 6, 7, 8, 9}  (8 states, offset +2 from {0..7})
 *
 * Keypress → group operation:
 *   Right  →  R  (clockwise rotation)      n_new = ((n − 2 + 1) mod 8) + 2
 *   Left   →  R⁻¹ (counter-clockwise)     n_new = ((n − 2 − 1 + 8) mod 8) + 2
 *   Up     →  S  (reflection / Delta-Pair) n_new = ((n − 2 + 4) mod 8) + 2
 *   Down   →  S  (same reflection)         n_new = ((n − 2 + 4) mod 8) + 2
 *   Select →  confirm (no group change)
 *   Back   →  reset to n=2, focus=0
 *
 * Focus index is advanced/retreated in lock-step with the group state so
 * that the user perceives a smooth, consistent spatial traversal of the
 * on-screen interactive elements.
 */

export type DpadKey = 'Right' | 'Left' | 'Up' | 'Down' | 'Select' | 'Back'

export interface NavigationState {
  /** Current D₈ state n ∈ {2..9}. */
  n:            number
  /** Index of the currently focused interactive element. */
  focusIndex:   number
  /** Total number of interactive elements on screen. */
  elementCount: number
}

// ---------------------------------------------------------------------------
// D₈ state-transition formulae
// ---------------------------------------------------------------------------

/** Clockwise rotation R₁: n_new = ((n − 2 + 1) mod 8) + 2 */
export function applyR(n: number): number {
  return ((n - 2 + 1) % 8) + 2
}

/** Counter-clockwise rotation R⁻¹: n_new = ((n − 2 − 1 + 8) mod 8) + 2 */
export function applyRInverse(n: number): number {
  return ((n - 2 - 1 + 8) % 8) + 2
}

/**
 * Reflection S — jump to the Delta-Pair partner state.
 * The partner of state n is ((n − 2 + 4) mod 8) + 2, i.e. the element
 * diagonally opposite in the D₈ Cayley table.
 */
export function applyS(n: number): number {
  return ((n - 2 + 4) % 8) + 2
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return the initial navigation state. */
export function initialNavState(elementCount = 0): NavigationState {
  return { n: 2, focusIndex: 0, elementCount }
}

/**
 * Compute the next NavigationState for a given D-pad keypress.
 *
 * The focus index tracks the active element; the D₈ group state n tracks
 * the mathematical position in the navigation space.
 */
export function handleDpad(state: NavigationState, key: DpadKey): NavigationState {
  const { n, focusIndex, elementCount } = state
  const count = Math.max(1, elementCount)

  switch (key) {
    case 'Right': {
      return {
        n:            applyR(n),
        focusIndex:   (focusIndex + 1) % count,
        elementCount,
      }
    }

    case 'Left': {
      return {
        n:            applyRInverse(n),
        focusIndex:   (focusIndex - 1 + count) % count,
        elementCount,
      }
    }

    case 'Up':
    case 'Down': {
      // S reflection: jump to the Delta-Pair partner.
      // Focus jumps by half the total element count, mirroring the group jump.
      const delta = Math.max(1, Math.floor(count / 2))
      return {
        n:            applyS(n),
        focusIndex:   (focusIndex + delta) % count,
        elementCount,
      }
    }

    case 'Select':
      // Confirm selection — group state unchanged; caller activates the element.
      return state

    case 'Back':
      return { n: 2, focusIndex: 0, elementCount }

    default:
      return state
  }
}
