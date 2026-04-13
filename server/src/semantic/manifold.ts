/**
 * 64-Dimensional Feature Manifold using D₈ vertex weights.
 *
 * Each DOM element's bounding-box corners are transformed by all 8 elements
 * of the dihedral group D₈ (symmetries of a square):
 *
 *   I, R, R², R³, S, SR, SR², SR³
 *
 * 4 corners × 8 group elements × 2 coordinates (x, y) = 64 floats → Float32Array(64).
 *
 * Coordinates are normalised to [-1, 1] relative to the viewport centre before
 * the group action is applied so that rotations and reflections are meaningful.
 */

// D₈ group elements as 2×2 matrices, stored as [a, b, c, d] ≡ [[a,b],[c,d]]
// where the group action on (x,y) gives (ax+by, cx+dy).
const D8_MATRICES: ReadonlyArray<readonly [number, number, number, number]> = [
  [ 1,  0,  0,  1],  // I    — identity
  [ 0, -1,  1,  0],  // R    — 90° CCW rotation
  [-1,  0,  0, -1],  // R²   — 180° rotation
  [ 0,  1, -1,  0],  // R³   — 270° CCW rotation
  [ 1,  0,  0, -1],  // S    — reflection over x-axis
  [ 0,  1,  1,  0],  // SR   — reflection over y = x
  [-1,  0,  0,  1],  // SR²  — reflection over y-axis
  [ 0, -1, -1,  0],  // SR³  — reflection over y = -x
]

export interface DomElement {
  /** HTML tag name, lower-cased (e.g. 'a', 'button'). */
  tag: string
  /** Semantic role derived from the tag or ARIA attribute. */
  role: string
  /** Bounding-box in viewport pixels. */
  x: number
  y: number
  width: number
  height: number
  /** Visible text content (truncated to 64 chars). */
  text?: string
}

/** Apply one D₈ matrix to a 2-D point. */
function applyD8(
  mat: readonly [number, number, number, number],
  x: number,
  y: number,
): [number, number] {
  return [mat[0] * x + mat[1] * y, mat[2] * x + mat[3] * y]
}

/**
 * Build a 64-dimensional manifold vector for a single DOM element.
 *
 * The four bounding-box corners are normalised to [-1, 1] relative to the
 * viewport centre, then each corner is projected through every D₈ group
 * element, yielding 4 × 8 × 2 = 64 floats stored as Float32Array(64).
 */
export function buildManifoldVector(
  el: DomElement,
  viewportWidth: number,
  viewportHeight: number,
): Float32Array {
  const vec = new Float32Array(64)

  // Normalise to [-1, 1] relative to viewport centre.
  const cx    = viewportWidth  / 2
  const cy    = viewportHeight / 2
  const scale = Math.max(viewportWidth, viewportHeight) / 2

  const corners: [number, number][] = [
    [(el.x              - cx) / scale, (el.y               - cy) / scale], // top-left
    [(el.x + el.width   - cx) / scale, (el.y               - cy) / scale], // top-right
    [(el.x              - cx) / scale, (el.y + el.height   - cy) / scale], // bottom-left
    [(el.x + el.width   - cx) / scale, (el.y + el.height   - cy) / scale], // bottom-right
  ]

  let idx = 0
  for (const [px, py] of corners) {
    for (const mat of D8_MATRICES) {
      const [tx, ty] = applyD8(mat, px, py)
      vec[idx++] = tx
      vec[idx++] = ty
    }
  }

  return vec
}

export interface SemanticFrame {
  seq:           number
  timestamp:     number
  viewportWidth: number
  viewportHeight: number
  /** LOD level: 0 = full density, 1 = half, 2 = quarter. */
  lodLevel:      number
  elements:      Array<{ el: DomElement; vector: Float32Array }>
}

/**
 * Build a SemanticFrame from a list of DOM elements.
 *
 * LOD downshift retains only every (2^lodLevel)-th element, thinning the
 * manifold density to reduce memory and bandwidth under resource pressure.
 */
export function buildSemanticFrame(
  seq:           number,
  elements:      DomElement[],
  viewportWidth: number,
  viewportHeight: number,
  lodLevel = 0,
): SemanticFrame {
  const stride   = 1 << lodLevel          // 1, 2, or 4
  const filtered = elements.filter((_, i) => i % stride === 0)

  return {
    seq,
    timestamp: Date.now(),
    viewportWidth,
    viewportHeight,
    lodLevel,
    elements: filtered.map((el) => ({
      el,
      vector: buildManifoldVector(el, viewportWidth, viewportHeight),
    })),
  }
}
