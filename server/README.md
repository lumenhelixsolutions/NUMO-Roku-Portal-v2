# NUMO BYOS Server

> **Bring Your Own Server** — the Windows Host-side semantic streaming engine.

The BYOS server offloads all heavy computation from the Roku Thin Client to the Windows host.
It captures a headless browser via Chrome DevTools Protocol, extracts the interactive DOM, maps it to a 64-dimensional feature manifold, and streams the result to the Roku device over a RUBIC-encrypted 32.C.U.B.I.T. WebSocket stream at 32 Hz.

---

## Architecture

```
                  Windows Host
  ┌────────────────────────────────────────────────────────┐
  │                                                        │
  │  ┌──────────────┐    CDP     ┌────────────────────┐   │
  │  │   Chrome     │◄──────────►│  CdpSemanticEngine │   │
  │  │  (headless)  │            │  (manifold.ts)     │   │
  │  └──────────────┘            └─────────┬──────────┘   │
  │                                        │ SemanticFrame │
  │  ┌──────────────┐            ┌─────────▼──────────┐   │
  │  │  Ollama      │◄──────────►│  OllamaRouter      │   │
  │  │  (Gemma 2)   │ REST/11434 │  (ollama.ts)       │   │
  │  └──────────────┘            └────────────────────┘   │
  │                                        │               │
  │  ┌──────────────┐            ┌─────────▼──────────┐   │
  │  │  Agent Zero  │ stdout pipe│  AgentZeroSidecar  │   │
  │  │  (Python)    │◄──────────►│  (agentZero.ts)    │   │
  │  └──────────────┘            └────────────────────┘   │
  │                                        │               │
  │           ┌───────────────────────────▼─────────────┐ │
  │           │  PasMonitor  │  NumoField  │  D₈ D-pad  │ │
  │           └───────────────────────────┬─────────────┘ │
  │                                       │               │
  │           ┌───────────────────────────▼─────────────┐ │
  │           │  RUBIC-224 encrypt  →  CUBIT encode      │ │
  │           └───────────────────────────┬─────────────┘ │
  │                                       │               │
  └───────────────────────────────────────┼───────────────┘
                            WebSocket :9000
                                       │
                               Roku Thin Client
```

---

## Modules

### `src/semantic/manifold.ts` — 64-D Feature Manifold
Builds a `Float32Array(64)` for each DOM element by applying all 8 elements of the dihedral group D₈ to the element's four bounding-box corners:

```
4 corners × 8 D₈ matrices × 2 coordinates (x, y) = 64 floats
```

LOD downshifting retains every 2^n-th element to thin manifold density under memory pressure.

### `src/semantic/cdp.ts` — CDP Semantic Engine
Uses `puppeteer-core` + `HeadlessExperimental.beginFrame` to deterministically capture browser frames, extract interactive DOM elements (links, buttons, inputs, ARIA roles), and produce `SemanticFrame` objects.

### `src/sync/rubic.ts` — RUBIC Encryption
224-bit key split into 4 × 56-bit seeds, each initialising a reversible Rule-90 cellular automaton rotor.  Because XOR is self-inverse:

```
C = P(M, K)      encrypt
M = P⁻¹(C, K)   decrypt  ≡  P(C, K)
```

The client can deterministically "unwind" its input history by replaying the same CA keystream.

### `src/sync/cubit.ts` — 32.C.U.B.I.T. Framing
Binary wire format for transmitting `SemanticFrame` data at 32 Hz.  The first 4 bytes are the plain magic `CUBI`; everything after is RUBIC-encrypted.  Each element occupies 273 bytes (role + bbox + 64 × f32 manifold vector).

### `src/navigation/dpad.ts` — D₈ D-pad Navigation
Maps Roku remote keypresses to D₈ state transitions:

| Key   | Operation | Formula                          |
|-------|-----------|----------------------------------|
| Right | R₁        | `((n-2+1) mod 8) + 2`            |
| Left  | R⁻¹       | `((n-2-1+8) mod 8) + 2`          |
| Up/Down | S (reflection) | `((n-2+4) mod 8) + 2`    |
| Select | — | confirm current focus                     |
| Back  | reset | `n=2, focusIndex=0`                    |

Group relations: R⁸ = 1, S² = 1, SRS = R⁻¹.

### `src/navigation/pas.ts` — Phase Alignment Score
```
PAS = mean cosine_similarity(centroid(frame[i-1]), centroid(frame[i]))
      over the last 32 frames (emission stack)
```

- **LOD downshift** when `PAS < 0.8` OR heap usage > 80%.
- **LOD upshift** when `PAS ≥ 0.8` AND heap usage < 56%.

### `src/navigation/numo.ts` — NUMO Field (10-D, D₈ × Z₂)
Resonance equation: `t_new = α_t + t · t̂`  where `t̂ = 1/32`.

The field holds a 10-D state vector for each of the 16 elements in D₈ × Z₂.  The active state is blended with incoming signals using `|sin(π·t)|` as the resonance envelope.

### `src/ai/ollama.ts` — Ollama AI Router
Sends queries to the local Ollama instance (port 11434):

| Prefix | Behaviour |
|--------|-----------|
| `SEARCH:<url or terms>` | Navigate + page summary |
| `QUESTION:<text>` | Multimodal: DOM text + screenshot |
| *(none)* | Plain text completion |

### `src/ai/agentZero.ts` — Agent Zero Sidecar
Spawns `python3 run_ui.py` in the configured `AGENT_ZERO_DIR`, pipes every stdout/stderr line to all connected WebSocket clients as `{ type: "agent", source, text, timestamp }` JSON messages.  Auto-restarts on crash (up to 10 attempts).

---

## Quick Start

```bash
cd server

# Install dependencies
npm install

# Start in development mode (auto-reload)
TARGET_URL=https://example.com npm run dev

# Or start in production mode
npm run build
TARGET_URL=https://example.com node dist/index.js
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `9000` | WebSocket server port |
| `TARGET_URL` | `https://example.com` | Initial URL for the headless browser |
| `CHROME_PATH` | *(auto)* | Absolute path to Chrome/Chromium binary |
| `VIEWPORT_W` | `1920` | Headless browser viewport width |
| `VIEWPORT_H` | `1080` | Headless browser viewport height |
| `OLLAMA_BASE` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `gemma2` | Ollama model tag |
| `AGENT_ZERO_ENABLED` | *(unset)* | Set to `1` to spawn Agent Zero |
| `AGENT_ZERO_DIR` | *(unset)* | Path to agent-zero working directory |
| `PYTHON_BIN` | `python3` | Python interpreter for Agent Zero |

---

## WebSocket message protocol

### Server → Client

| Message | Format | Description |
|---|---|---|
| `handshake` | JSON | RUBIC key (base64), stream rate, viewport |
| *(binary)* | CUBIT frame | Encrypted 64-D manifold frame |
| `telemetry` | JSON | PAS, LOD, memory, NUMO `t`, element count |
| `nav` | JSON | Updated focus index and D₈ state `n` after a D-pad event |
| `ai_response` | JSON | Ollama model response |
| `agent` | JSON | Agent Zero stdout/stderr line |
| `error` | JSON | Error description |

### Client → Server

| Message | Format | Description |
|---|---|---|
| `dpad` | JSON `{ type: "dpad", key: "Right" }` | D-pad keypress |
| `query` | JSON `{ type: "query", query: "SEARCH:..." }` | AI query |

---

## System requirements

- **Node.js** ≥ 20
- **Google Chrome** or **Chromium** (stable)
- **Ollama** running locally with `gemma2` pulled (`ollama pull gemma2`)
- *(optional)* **Agent Zero** Python environment cloned separately
