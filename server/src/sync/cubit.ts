/**
 * 32.C.U.B.I.T. — 32-bit Compressed Universal Binary Interleaved Transfer.
 *
 * Frames the SemanticFrame (64-D manifold vectors) into a compact binary wire
 * format for streaming over WebSocket to the Roku Thin Client at 32 Hz.
 * The payload (everything after the 4-byte magic) is encrypted with RUBIC
 * before transmission.
 *
 * Frame layout (big-endian unless noted):
 * ┌──────────────────────────────────────────────┐
 * │  4 B  magic        = 0x43554249 ("CUBI")     │  ← plain (framing)
 * ╞══════════════════════════════════════════════╡
 * │  4 B  seq          frame sequence number      │  ╮
 * │  4 B  ts_hi        timestamp ms, high 32 bits │  │
 * │  4 B  ts_lo        timestamp ms, low  32 bits │  │
 * │  2 B  vw           viewport width             │  │
 * │  2 B  vh           viewport height            │  │  RUBIC-encrypted
 * │  1 B  lod          LOD level (0-2)            │  │
 * │  1 B  pas_u8       PAS × 255 (fixed-point)    │  │
 * │  2 B  count        number of elements         │  │
 * │  for each element (273 bytes):                │  │
 * │    1 B  role_code                             │  │
 * │    4×4B x,y,w,h   bounding box (f32 BE)       │  │
 * │    64×4B vector   manifold vector (f32 BE)    │  │
 * └──────────────────────────────────────────────╯  ╯
 */

import { type SemanticFrame } from '../semantic/manifold.js'
import { type Rubic } from './rubic.js'

const MAGIC    = 0x43554249   // "CUBI" as uint32 BE
const ROLE_CODES: Record<string, number> = {
  link:   1,
  button: 2,
  input:  3,
  text:   4,
  other:  0,
}

const HEADER_BYTES  = 4 + 4 + 4 + 4 + 2 + 2 + 1 + 1 + 2  // 24 bytes
const ELEMENT_BYTES = 1 + 4 * 4 + 64 * 4                  // 273 bytes

function encodeRole(role: string): number {
  return ROLE_CODES[role] ?? 0
}

function decodeRole(code: number): string {
  return Object.entries(ROLE_CODES).find(([, v]) => v === code)?.[0] ?? 'other'
}

// ---------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------

/**
 * Encode a SemanticFrame into a CUBIT binary buffer ready for WebSocket
 * transmission.  The payload after the magic is RUBIC-encrypted in-place.
 */
export function encodeFrame(frame: SemanticFrame, rubic: Rubic, pas = 1.0): Uint8Array {
  const count     = frame.elements.length
  const totalSize = 4 /* magic */ + (HEADER_BYTES - 4) /* rest of header */ + count * ELEMENT_BYTES
  // Note: HEADER_BYTES already includes the 4-byte magic, so the layout is:
  //   magic (4) | header-minus-magic (20) | elements (count × 273)
  const actualTotal = HEADER_BYTES + count * ELEMENT_BYTES

  const buf   = new ArrayBuffer(actualTotal)
  const view  = new DataView(buf)
  const bytes = new Uint8Array(buf)

  let off = 0

  // ── Header ────────────────────────────────────────────────────────────────
  view.setUint32(off, MAGIC, false);                                off += 4  // plain
  view.setUint32(off, frame.seq, false);                            off += 4
  view.setUint32(off, Math.floor(frame.timestamp / 0x1_0000_0000), false); off += 4
  view.setUint32(off, frame.timestamp >>> 0, false);                off += 4
  view.setUint16(off, frame.viewportWidth, false);                  off += 2
  view.setUint16(off, frame.viewportHeight, false);                 off += 2
  view.setUint8(off, frame.lodLevel);                               off += 1
  view.setUint8(off, Math.round(Math.min(1, Math.max(0, pas)) * 255)); off += 1
  view.setUint16(off, count, false);                                off += 2

  // ── Elements ──────────────────────────────────────────────────────────────
  for (const { el, vector } of frame.elements) {
    view.setUint8(off, encodeRole(el.role));   off += 1
    view.setFloat32(off, el.x,      false);   off += 4
    view.setFloat32(off, el.y,      false);   off += 4
    view.setFloat32(off, el.width,  false);   off += 4
    view.setFloat32(off, el.height, false);   off += 4
    for (let i = 0; i < 64; i++) {
      view.setFloat32(off, vector[i] ?? 0, false);
      off += 4
    }
  }

  // Encrypt everything after the magic (bytes 4 onward).
  const encrypted = rubic.encrypt(bytes.subarray(4))
  bytes.set(encrypted, 4)

  return bytes
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

/**
 * Decode a CUBIT frame received over WebSocket.
 * Returns the decrypted SemanticFrame and the PAS score.
 */
export function decodeFrame(
  raw:   Uint8Array,
  rubic: Rubic,
): { frame: SemanticFrame; pas: number } {
  if (raw.length < HEADER_BYTES) throw new Error('CUBIT: buffer too short')

  const magic = new DataView(raw.buffer, raw.byteOffset, 4).getUint32(0, false)
  if (magic !== MAGIC) throw new Error(`CUBIT: bad magic 0x${magic.toString(16)}`)

  // Decrypt payload after magic.
  const plain = rubic.decrypt(raw.subarray(4))
  const pv    = new DataView(plain.buffer, plain.byteOffset, plain.byteLength)

  let off = 0
  const seq    = pv.getUint32(off, false);  off += 4
  const tsHi   = pv.getUint32(off, false);  off += 4
  const tsLo   = pv.getUint32(off, false);  off += 4
  const ts     = tsHi * 0x1_0000_0000 + tsLo
  const vw     = pv.getUint16(off, false);  off += 2
  const vh     = pv.getUint16(off, false);  off += 2
  const lod    = pv.getUint8(off);          off += 1
  const pasU8  = pv.getUint8(off);          off += 1
  const count  = pv.getUint16(off, false);  off += 2

  const elements: SemanticFrame['elements'] = []
  for (let e = 0; e < count; e++) {
    const role   = decodeRole(pv.getUint8(off));  off += 1
    const x      = pv.getFloat32(off, false);     off += 4
    const y      = pv.getFloat32(off, false);     off += 4
    const width  = pv.getFloat32(off, false);     off += 4
    const height = pv.getFloat32(off, false);     off += 4
    const vector = new Float32Array(64)
    for (let i = 0; i < 64; i++) {
      vector[i] = pv.getFloat32(off, false);      off += 4
    }
    elements.push({ el: { tag: role, role, x, y, width, height }, vector })
  }

  return {
    frame: { seq, timestamp: ts, viewportWidth: vw, viewportHeight: vh, lodLevel: lod, elements },
    pas:   pasU8 / 255,
  }
}
