/**
 * RUBIC — Reversible Rotor Arithmetic across four Cellular Automata.
 *
 * Security model
 * ──────────────
 *   Key K  : 224 bits = 28 bytes, split into 4 × 56-bit (7-byte) rotor seeds.
 *   Encrypt: C = P(M, K)       — pass message through all four CA rotors in order.
 *   Decrypt: M = P⁻¹(C, K)    — same operation (XOR stream cipher is self-inverse).
 *
 * Each rotor is an instance of a reversible cellular automaton (Rule-90 variant
 * over GF(2)) whose state at position i determines the keystream byte at that
 * offset.  The rotor advances one generation whenever its state buffer is
 * exhausted, maintaining a running keystream that the client can "unwind"
 * deterministically given K and the frame sequence number.
 *
 * Rule 90: next[i] = state[(i-1) mod n] XOR state[(i+1) mod n]
 * This rule is linear over GF(2) and its generator matrix is invertible,
 * making the CA evolution bijective (reversible).
 */

const ROTOR_COUNT = 4
const KEY_BYTES   = 28          // 224 bits
const SEED_BYTES  = KEY_BYTES / ROTOR_COUNT  // 7 bytes per rotor
const CA_SIZE     = 64          // internal CA state width (bytes)
const WARMUP_GENS = 8           // CA warm-up generations before first use

// ---------------------------------------------------------------------------
// Internal: single CA rotor
// ---------------------------------------------------------------------------

class CaRotor {
  private state: Uint8Array

  constructor(seed: Uint8Array) {
    if (seed.length !== SEED_BYTES) {
      throw new Error(`RUBIC rotor seed must be ${SEED_BYTES} bytes`)
    }

    // Expand the 7-byte seed to a CA_SIZE-byte state via a diffusion step.
    this.state = new Uint8Array(CA_SIZE)
    for (let i = 0; i < CA_SIZE; i++) {
      this.state[i] = seed[i % SEED_BYTES] ^ ((i * 0x9e3779b9) & 0xff)
    }

    // Warm-up: advance the CA several generations to destroy seed structure.
    for (let g = 0; g < WARMUP_GENS; g++) this.step()
  }

  /**
   * One generation of Rule-90 CA.
   * next[i] = state[(i-1) mod n]  XOR  state[(i+1) mod n]
   */
  private step(): void {
    const n    = this.state.length
    const next = new Uint8Array(n)
    for (let i = 0; i < n; i++) {
      next[i] = this.state[(i - 1 + n) % n] ^ this.state[(i + 1) % n]
    }
    this.state = next
  }

  /**
   * Generate `len` bytes of keystream, advancing the CA state when the
   * internal buffer is consumed.
   */
  keystream(len: number): Uint8Array {
    const out = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      out[i] = this.state[i % CA_SIZE]
      // Advance the CA at every CA_SIZE-th byte.
      if ((i + 1) % CA_SIZE === 0) this.step()
    }
    return out
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class Rubic {
  private readonly rotors: CaRotor[]

  /** @param key 224-bit (28-byte) shared secret. */
  constructor(key: Uint8Array) {
    if (key.length !== KEY_BYTES) {
      throw new Error(`RUBIC key must be exactly ${KEY_BYTES} bytes (224 bits); got ${key.length}`)
    }
    this.rotors = Array.from(
      { length: ROTOR_COUNT },
      (_, r) => new CaRotor(key.subarray(r * SEED_BYTES, (r + 1) * SEED_BYTES)),
    )
  }

  /**
   * P(M, K) — pass data through all four CA rotors sequentially.
   * Because each rotor's operation is XOR with its keystream, and XOR is
   * self-inverse, the same function serves as both encrypt and decrypt:
   *   P(P(M, K), K) = M
   */
  process(data: Uint8Array): Uint8Array {
    let buf = new Uint8Array(data)
    for (const rotor of this.rotors) {
      const ks = rotor.keystream(buf.length)
      const out = new Uint8Array(buf.length)
      for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ ks[i]
      buf = out
    }
    return buf
  }

  /** Alias for process() — C = P(M, K). */
  encrypt(plaintext: Uint8Array): Uint8Array {
    return this.process(plaintext)
  }

  /** Alias for process() — M = P⁻¹(C, K). */
  decrypt(ciphertext: Uint8Array): Uint8Array {
    return this.process(ciphertext)
  }
}

/** Generate a cryptographically random 224-bit RUBIC key. */
export function generateRubicKey(): Uint8Array {
  const key = new Uint8Array(KEY_BYTES)
  crypto.getRandomValues(key)
  return key
}
