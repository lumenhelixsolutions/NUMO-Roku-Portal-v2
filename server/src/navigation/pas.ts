/**
 * Phase Alignment Score (PAS) monitoring and LOD Downshift.
 *
 * PAS definition
 * ──────────────
 *   PAS = mean cosine similarity between consecutive frame centroids
 *         over the emission stack (last STACK_SIZE frames).
 *
 *   A score ≥ 0.8 indicates a coherent, well-aligned semantic stream.
 *   A score < 0.8 means the scene has changed significantly or the stream
 *   has diverged — LOD should be reduced to recover bandwidth headroom.
 *
 * LOD Downshift triggers
 * ──────────────────────
 *   • PAS < PAS_THRESHOLD (0.8), or
 *   • Node.js heap usage > 80% of heapTotal.
 *
 * LOD levels
 *   0 — full density  (all elements)
 *   1 — half density  (every 2nd element)
 *   2 — quarter density (every 4th element)
 *
 * LOD recovers (upshifts) when PAS ≥ 0.8 AND memory falls below 56% of heapTotal.
 */

import { type SemanticFrame } from '../semantic/manifold.js'

export const PAS_THRESHOLD     = 0.8
const STACK_SIZE               = 32    // frames kept in the emission stack
const MEMORY_HIGH_WATERMARK    = 0.80  // trigger downshift above this fraction
const MEMORY_LOW_WATERMARK     = 0.56  // allow upshift below this fraction
const MAX_LOD                  = 2

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Cosine similarity of two equal-length Float32Arrays. */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na  += a[i] * a[i]
    nb  += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 1.0 : dot / denom
}

/**
 * Aggregate a frame's manifold vectors into a single 64-D centroid.
 * An empty frame returns the zero vector (similarity = 1 with another zero).
 */
function frameCentroid(frame: SemanticFrame): Float32Array {
  const out = new Float32Array(64)
  if (frame.elements.length === 0) return out
  for (const { vector } of frame.elements) {
    for (let i = 0; i < 64; i++) out[i] += vector[i]
  }
  const inv = 1 / frame.elements.length
  for (let i = 0; i < 64; i++) out[i] *= inv
  return out
}

// ---------------------------------------------------------------------------
// PasMonitor
// ---------------------------------------------------------------------------

export interface PasStatus {
  pas:     number
  lod:     number
  aligned: boolean
  memFrac: number
}

export class PasMonitor {
  private readonly stack: SemanticFrame[] = []
  private _pas      = 1.0
  private _lodLevel = 0

  // ── Public interface ──────────────────────────────────────────────────────

  /** Ingest a new frame and recompute PAS + LOD. */
  push(frame: SemanticFrame): void {
    this.stack.push(frame)
    if (this.stack.length > STACK_SIZE) this.stack.shift()
    this._pas = this.computePas()
    this.adjustLod()
  }

  /** Current Phase Alignment Score ∈ [0, 1]. */
  get pas(): number { return this._pas }

  /** Current LOD level (0 = full density). */
  get lodLevel(): number { return this._lodLevel }

  /** True when PAS ≥ threshold and the stream is considered aligned. */
  get aligned(): boolean { return this._pas >= PAS_THRESHOLD }

  /** Snapshot of all monitoring metrics. */
  status(): PasStatus {
    return {
      pas:     this._pas,
      lod:     this._lodLevel,
      aligned: this.aligned,
      memFrac: this.memFrac(),
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private computePas(): number {
    if (this.stack.length < 2) return 1.0
    let sum = 0
    for (let i = 1; i < this.stack.length; i++) {
      sum += cosineSimilarity(
        frameCentroid(this.stack[i - 1]),
        frameCentroid(this.stack[i]),
      )
    }
    return sum / (this.stack.length - 1)
  }

  private adjustLod(): void {
    const mem = this.memFrac()
    if (!this.aligned || mem > MEMORY_HIGH_WATERMARK) {
      // Downshift: increase LOD (reduce density).
      this._lodLevel = Math.min(this._lodLevel + 1, MAX_LOD)
    } else if (this.aligned && mem < MEMORY_LOW_WATERMARK) {
      // Upshift: restore density when conditions improve.
      this._lodLevel = Math.max(this._lodLevel - 1, 0)
    }
    // Hysteresis: no change when in the band [LOW, HIGH].
  }

  private memFrac(): number {
    const { heapUsed, heapTotal } = process.memoryUsage()
    return heapTotal > 0 ? heapUsed / heapTotal : 0
  }
}
