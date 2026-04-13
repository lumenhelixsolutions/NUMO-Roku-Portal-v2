/**
 * NUMO Field — 10-dimensional state structure with D₈ × Z₂ symmetry.
 *
 * Structure
 * ─────────
 *   D₈ × Z₂  has  |D₈| × |Z₂| = 8 × 2 = 16 group elements.
 *   The NUMO Field maintains a 10-D state vector for each element, giving a
 *   10 × 16 = 160-float internal representation.
 *
 * Resonance equation
 * ──────────────────
 *   t_new = α_t + t · t̂
 *
 *   where:
 *     α_t — base timing offset (phase-lock parameter, caller-supplied)
 *     t̂   — quantum interval = 1 / STREAM_RATE  (1/32 s for a 32 Hz stream)
 *     t   — current resonance time
 *
 *   The equation is self-referential: t evolves multiplicatively, producing a
 *   geometric series offset by α_t.  For α_t = 0 the series decays to zero;
 *   for |α_t| > 0 the field converges to a fixed point t* = α_t / (1 − t̂).
 *
 * State update
 * ────────────
 *   The active group element's 10-D state is blended with an incoming signal
 *   using |sin(π·t)| as the resonance envelope (peaks at half-integer t values).
 */

export const STREAM_RATE = 32          // Hz
export const NUMO_DIM    = 10          // dimensions per group element
export const GROUP_SIZE  = 16          // |D₈ × Z₂|

export interface NumoField {
  /** 10-D state vector for each of the 16 group elements: Float32Array[16][10]. */
  states:   Float32Array[]
  /** Currently active group element index ∈ {0..15}. */
  groupIdx: number
  /** Current resonance time t. */
  t:        number
  /** Base timing offset α_t. */
  alpha:    number
  /** Quantum interval t̂ = 1 / STREAM_RATE. */
  tHat:     number
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create a NUMO Field with uniform zero states. */
export function createNumoField(alpha = 0): NumoField {
  return {
    states:   Array.from({ length: GROUP_SIZE }, () => new Float32Array(NUMO_DIM)),
    groupIdx: 0,
    t:        0,
    alpha,
    tHat:     1 / STREAM_RATE,
  }
}

/**
 * Advance the NUMO Field by one quantum step using the resonance equation.
 *
 *   t_new = α_t + t · t̂
 */
export function stepNumoField(field: NumoField): NumoField {
  return { ...field, t: field.alpha + field.t * field.tHat }
}

/**
 * Blend a 10-D signal into the state of a specific group element using the
 * resonance envelope weight w = |sin(π · t)|.
 *
 *   state_new[d] = state[d] · (1 − w) + signal[d] · w
 */
export function updateNumoState(
  field:    NumoField,
  groupIdx: number,
  signal:   Float32Array,
): NumoField {
  if (signal.length !== NUMO_DIM) {
    throw new Error(`NUMO signal must be ${NUMO_DIM}-dimensional`)
  }

  const weight  = Math.abs(Math.sin(Math.PI * field.t))
  const weight1 = 1 - weight

  const newStates = field.states.map((s, i) => {
    if (i !== groupIdx) return s
    const updated = new Float32Array(NUMO_DIM)
    for (let d = 0; d < NUMO_DIM; d++) {
      updated[d] = s[d] * weight1 + signal[d] * weight
    }
    return updated
  })

  return { ...field, states: newStates, groupIdx }
}

/**
 * Map a D₈ navigation state n ∈ {2..9} and a Z₂ component ∈ {0, 1} to
 * a D₈ × Z₂ group element index ∈ {0..15}.
 *
 *   d8Idx  = (n − 2) mod 8          →  D₈ component 0..7
 *   groupIdx = d8Idx + z2 × 8       →  D₈ × Z₂ component 0..15
 */
export function navStateToGroupIdx(n: number, z2: 0 | 1 = 0): number {
  const d8Idx = ((n - 2) % 8 + 8) % 8
  return d8Idx + z2 * 8
}

/** Retrieve the active 10-D state vector for a D-pad navigation state. */
export function getActiveState(field: NumoField, n: number, z2: 0 | 1 = 0): Float32Array {
  return field.states[navStateToGroupIdx(n, z2)]
}
