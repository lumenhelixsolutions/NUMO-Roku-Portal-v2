/**
 * NUMO BYOS Semantic Streaming Server — entry point.
 *
 * Responsibilities
 * ────────────────
 *   • Launch the headless Chrome browser via the CDP Semantic Engine.
 *   • Run the streaming loop at 32 Hz: capture → build manifold →
 *     compute PAS → LOD-adjust → RUBIC-encrypt → CUBIT-encode → broadcast.
 *   • Accept WebSocket connections from Roku Thin Clients.
 *   • Handle D-pad navigation events and translate them through D₈ group ops.
 *   • Route AI queries to Ollama (SEARCH / QUESTION).
 *   • Optionally spawn the Agent Zero Python sidecar and pipe its output to clients.
 *
 * Environment variables
 * ─────────────────────
 *   PORT               WebSocket port (default: 9000)
 *   TARGET_URL         Initial URL for the headless browser (default: https://example.com)
 *   CHROME_PATH        Absolute path to Chrome binary (auto-detected if unset)
 *   VIEWPORT_W / H     Viewport dimensions (default: 1920 × 1080)
 *   AGENT_ZERO_ENABLED Set to "1" to spawn the Agent Zero sidecar
 *   AGENT_ZERO_DIR     Path to the agent-zero working directory
 *   PYTHON_BIN         Python interpreter for Agent Zero (default: python3)
 *   OLLAMA_BASE        Ollama base URL (default: http://localhost:11434)
 *   OLLAMA_MODEL       Model tag (default: gemma2)
 */

import { WebSocketServer, type WebSocket, type RawData } from 'ws'
import { CdpSemanticEngine }                             from './semantic/cdp.js'
import { encodeFrame }                                   from './sync/cubit.js'
import { Rubic, generateRubicKey }                       from './sync/rubic.js'
import { PasMonitor }                                    from './navigation/pas.js'
import { handleDpad, initialNavState, type DpadKey }     from './navigation/dpad.js'
import { createNumoField, stepNumoField }                from './navigation/numo.js'
import { OllamaRouter }                                  from './ai/ollama.js'
import { AgentZeroSidecar }                              from './ai/agentZero.js'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT        = Number(process.env.PORT        ?? 9000)
const TARGET_URL  = process.env.TARGET_URL         ?? 'https://example.com'
const VW          = Number(process.env.VIEWPORT_W  ?? 1920)
const VH          = Number(process.env.VIEWPORT_H  ?? 1080)
const FRAME_RATE  = 32                              // Hz  (32.C.U.B.I.T. quantum rate)
const FRAME_MS    = 1000 / FRAME_RATE               // ~31.25 ms per frame

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

const rubicKey   = generateRubicKey()
const rubic      = new Rubic(rubicKey)
const pasMonitor = new PasMonitor()

let numoField  = createNumoField()
let navState   = initialNavState()

const engine   = new CdpSemanticEngine({
  executablePath: process.env.CHROME_PATH,
  targetUrl:      TARGET_URL,
  viewportWidth:  VW,
  viewportHeight: VH,
})

const ollamaRouter = new OllamaRouter(engine)

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------

const wss     = new WebSocketServer({ port: PORT })
const clients = new Set<WebSocket>()

function broadcast(data: Uint8Array | string): void {
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(data)
  }
}

/** Incoming message shape from Roku clients. */
interface ClientMessage {
  type:   string
  key?:   string    // D-pad key for 'dpad' messages
  query?: string    // query string for 'query' messages
}

wss.on('connection', (ws, req) => {
  clients.add(ws)
  console.log(`[WS] + client  (${clients.size} connected)  from ${req.socket.remoteAddress}`)

  // Send the handshake: RUBIC key (base64) and stream metadata.
  // In production, the key should be delivered over a separate authenticated channel.
  ws.send(JSON.stringify({
    type: 'handshake',
    key:  Buffer.from(rubicKey).toString('base64'),
    rate: FRAME_RATE,
    vw:   VW,
    vh:   VH,
  }))

  ws.on('message', async (raw: RawData) => {
    let msg: ClientMessage | null = null
    try { msg = JSON.parse(raw.toString()) as ClientMessage } catch { return }

    switch (msg.type) {
      // ── D-pad navigation ─────────────────────────────────────────────────
      case 'dpad': {
        const key = msg.key as DpadKey
        navState  = handleDpad(navState, key)
        numoField = stepNumoField(numoField)
        broadcast(JSON.stringify({
          type:       'nav',
          n:          navState.n,
          focusIndex: navState.focusIndex,
          t:          numoField.t,
        }))
        break
      }

      // ── AI query ─────────────────────────────────────────────────────────
      case 'query': {
        const query = (msg.query ?? '').trim()
        if (!query) break
        try {
          const result = await ollamaRouter.route(query)
          ws.send(JSON.stringify({ ...result, type: 'ai_response' }))
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', message: String(err) }))
        }
        break
      }

      default:
        break
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
    console.log(`[WS] - client  (${clients.size} connected)`)
  })

  ws.on('error', (err) => {
    console.error('[WS] socket error:', err.message)
  })
})

// ---------------------------------------------------------------------------
// 32 Hz semantic streaming loop
// ---------------------------------------------------------------------------

async function streamLoop(): Promise<void> {
  let frameStart = Date.now()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // 1. Capture frame from the headless browser via CDP.
      const frame = await engine.captureFrame()

      // 2. Apply the LOD level determined by the PAS monitor.
      frame.lodLevel = pasMonitor.lodLevel

      // 3. Update PAS with this frame.
      pasMonitor.push(frame)

      // 4. Advance the NUMO Field resonance time.
      numoField = stepNumoField(numoField)

      // 5. Broadcast to all connected clients (binary + JSON telemetry).
      if (clients.size > 0) {
        const encoded = encodeFrame(frame, rubic, pasMonitor.pas)
        broadcast(encoded)

        const { pas, lod, aligned, memFrac } = pasMonitor.status()
        broadcast(JSON.stringify({
          type:     'telemetry',
          seq:      frame.seq,
          pas:      +pas.toFixed(4),
          lod,
          aligned,
          memFrac:  +memFrac.toFixed(4),
          elements: frame.elements.length,
          t:        +numoField.t.toFixed(6),
          navN:     navState.n,
        }))
      }
    } catch (err) {
      console.error('[Stream] frame error:', err)
    }

    // Pace the loop to exactly FRAME_RATE Hz.
    const elapsed = Date.now() - frameStart
    const wait    = Math.max(0, FRAME_MS - elapsed)
    await sleep(wait)
    frameStart = Date.now()
  }
}

// ---------------------------------------------------------------------------
// Agent Zero sidecar (optional)
// ---------------------------------------------------------------------------

function startAgentZero(): void {
  const workDir = process.env.AGENT_ZERO_DIR
  if (!workDir) {
    console.warn('[AgentZero] AGENT_ZERO_DIR not set — sidecar disabled')
    return
  }

  const sidecar = new AgentZeroSidecar({
    workDir,
    pythonBin:   process.env.PYTHON_BIN ?? 'python3',
    restartDelay: 3_000,
    maxRestarts:  10,
  })

  sidecar.on('line', (line) => {
    broadcast(JSON.stringify({ type: 'agent', ...line }))
  })

  sidecar.on('restart', (attempt) => {
    console.warn(`[AgentZero] restarting (attempt ${attempt})…`)
  })

  sidecar.on('error', (err) => {
    console.error('[AgentZero]', err.message)
  })

  sidecar.start()
  console.log('[AgentZero] sidecar started')
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   NUMO BYOS Semantic Streaming Server    ║')
  console.log('╚══════════════════════════════════════════╝')

  await engine.launch()
  console.log(`[CDP]    headless browser launched  →  ${TARGET_URL}`)
  console.log(`[WS]     listening on ws://0.0.0.0:${PORT}`)
  console.log(`[CUBIT]  streaming at ${FRAME_RATE} Hz  |  RUBIC-224 encryption enabled`)
  console.log(`[PAS]    threshold ≥ ${0.8}  |  LOD auto-scaling 0-2`)

  if (process.env.AGENT_ZERO_ENABLED === '1') startAgentZero()

  // Graceful shutdown
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, async () => {
      console.log(`\n[Server] ${sig} received — shutting down…`)
      await engine.close()
      wss.close()
      process.exit(0)
    })
  }

  await streamLoop()   // runs forever
}

main().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})
