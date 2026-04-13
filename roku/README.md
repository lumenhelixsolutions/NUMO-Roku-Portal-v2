# NUMO Roku Thin Client

> **Part Two of the NUMO BYOS Architecture** — the BrightScript SceneGraph channel that
> receives RUBIC-encrypted 32.C.U.B.I.T. semantic frames from the Windows host server
> and renders interactive element overlays on the Roku TV.

---

## Architecture

```
          Windows Host (BYOS Server)
  ┌───────────────────────────────────┐
  │  CDP → Manifold → RUBIC-encrypt   │
  │  → CUBIT-frame → WebSocket :9000  │
  └───────────────────┬───────────────┘
                      │ ws://host:9000
              ────────┘────────
           Roku TV (Thin Client)
  ┌───────────────────────────────────┐
  │  StreamTask (background thread)   │
  │    roWebSocket                    │
  │    RUBIC-224 decrypt (rubic.brs)  │
  │    CUBIT frame decode (cubit.brs) │
  │            ↓ fields               │
  │  NUMOScene (render thread)        │
  │    Element overlays (Rectangle)   │
  │    D-pad → D₈ navigation events  │
  │    PAS / LOD / telemetry HUD      │
  └───────────────────────────────────┘
```

---

## File Structure

```
roku/
├── manifest                    # Roku channel manifest
├── README.md                   # This file
├── source/
│   └── main.brs                # Channel entry point (creates roSGScreen)
└── components/
    ├── NUMOScene.xml            # Main SceneGraph scene definition
    ├── NUMOScene.brs            # Scene logic: D-pad, overlays, HUD
    ├── StreamTask.xml           # Background Task node definition
    ├── StreamTask.brs           # WebSocket + RUBIC + CUBIT decode
    ├── rubic.brs                # RUBIC-224 CA cipher (shared by StreamTask)
    └── cubit.brs                # 32.C.U.B.I.T. frame decoder (shared by StreamTask)
```

---

## Modules

### `rubic.brs` — RUBIC-224 Cipher

BrightScript port of `server/src/sync/rubic.ts`. Implements the four-rotor
reversible cellular-automaton XOR stream cipher.

Key functions:

| Function | Description |
|---|---|
| `RubicCreate(key)` | Create a cipher context from a 28-byte `roByteArray` key |
| `RubicProcess(data, rubic)` | Encrypt or decrypt data (self-inverse XOR) |
| `RubicStepCA(state)` | Advance one Rule-90 CA generation |
| `RubicKeystream(rotor, len)` | Generate `len` bytes of keystream |

The RUBIC context is stateful — rotor states advance with each call to
`RubicProcess()`, maintaining exact synchronisation with the server's keystream.

### `cubit.brs` — 32.C.U.B.I.T. Decoder

BrightScript port of `server/src/sync/cubit.ts`. Parses the binary wire format.

Key functions:

| Function | Description |
|---|---|
| `CubitDecodeFrame(raw, rubic)` | Decode a raw binary CUBIT frame; returns `{seq, vw, vh, lod, pas, elements[]}` |
| `ReadFloat32BE(ba, offset)` | Read a big-endian IEEE 754 float32 from a `roByteArray` |
| `ReadUint32BE(ba, offset)` | Read a big-endian uint32 |
| `ReadUint16BE(ba, offset)` | Read a big-endian uint16 |

The 64-D manifold vectors are decoded past (not used) to maintain correct
buffer offsets; only the role code and bounding-box coordinates are retained
for overlay rendering.

### `StreamTask.brs` — Background Streaming Task

Runs in a dedicated Roku thread. Manages the WebSocket lifecycle and message
dispatch:

- `roWebSocket` connects to `ws://host:9000`
- On `handshake` JSON: decodes base64 RUBIC key → `RubicCreate()` → sets
  `rubicReady = true`
- On binary frames: `CubitDecodeFrame()` → writes `frameInfo` + `frameElements`
  fields for NUMOScene
- On `dpadKey` field change from scene: sends `{ type: "dpad", key: "…" }` JSON
  to server

### `NUMOScene.brs` — SceneGraph UI

Render-thread component:

- Launches `StreamTask`, observes its output fields
- On each `frameElements` update: rebuilds `overlayGroup` with `Rectangle`
  nodes at each element's bounding-box position
- Focused element highlighted white; others coloured by role (blue=button,
  green=link, red=input)
- `OnKeyEvent()` maps Roku remote keys to D₈ key names and sets `task.dpadKey`
- Updates status, PAS/LOD indicator, and AI/Agent footer on field changes

---

## D₈ Navigation Mapping

| Roku Key | D₈ Operation | Server Key Name | Focus Effect |
|---|---|---|---|
| Right | R (CW rotation) | `"Right"` | +1 element |
| Left | R⁻¹ (CCW rotation) | `"Left"` | −1 element |
| Up | S (reflection) | `"Up"` | +½ element list |
| Down | S (reflection) | `"Down"` | −½ element list |
| OK | confirm | `"Select"` | no change |
| Back | reset | `"Back"` | reset to 0 |

Group relations: R⁸ = 1, S² = 1, SRS = R⁻¹.

---

## Quick Start

### 1. Configure the Server IP

Edit `components/NUMOScene.brs`:

```brightscript
Const DEFAULT_SERVER_IP   = "192.168.1.100"   ' ← your Windows host IP
Const DEFAULT_SERVER_PORT = "9000"
```

### 2. Start the BYOS Server

On the Windows host:

```bash
cd server
npm install
TARGET_URL=https://example.com npm run dev
```

### 3. Sideload the Channel

Package the `roku/` directory as a `.pkg` file and sideload via the Roku
Developer Application Installer:

```bash
# From the repo root — requires zip:
cd roku
zip -r ../numo-thin-client.zip . -x "*.DS_Store"
# Then upload numo-thin-client.zip at http://<roku-ip>/
```

---

## WebSocket Protocol Summary

### Server → Client

| Message | Format | Description |
|---|---|---|
| `handshake` | JSON | `{ type, key (base64), rate, vw, vh }` — RUBIC key + stream metadata |
| *(binary)* | CUBIT frame | RUBIC-encrypted 64-D manifold frame at 32 Hz |
| `telemetry` | JSON | `{ type, seq, pas, lod, aligned, memFrac, elements, t, navN }` |
| `nav` | JSON | `{ type, n, focusIndex, t }` — D₈ state after D-pad event |
| `ai_response` | JSON | `{ type, query, response }` — Ollama model reply |
| `agent` | JSON | `{ type, source, text, timestamp }` — Agent Zero stdout/stderr |
| `error` | JSON | `{ type, message }` |

### Client → Server

| Message | Format | Description |
|---|---|---|
| `dpad` | JSON | `{ type: "dpad", key: "Right"\|"Left"\|"Up"\|"Down"\|"Select"\|"Back" }` |
| `query` | JSON | `{ type: "query", query: "SEARCH:…" \| "QUESTION:…" }` |

---

## System Requirements

- **Roku OS** ≥ 11.0 (`roWebSocket` available in Task nodes)
- **NUMO BYOS Server** running on the same LAN (see `server/README.md`)
- **Chrome / Chromium** on the Windows host for CDP capture
- Same Wi-Fi network as the Roku device
