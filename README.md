# NUMO Roku Portal v2

A cross-platform device management suite for Roku streaming devices, built with Tauri, React, Tailwind CSS, and Kotlin.

---

## ✨ Features

### Desktop Application (Tauri v2)
- ✅ Ultra-lightweight launcher (30-80 MB idle memory)
- ✅ Automated system diagnostics (Node, Python, Ollama, GPU, RAM)
- ✅ Professional onboarding wizard with React + Tailwind CSS
- ✅ Real-time telemetry dashboard (PAS, memory, latency, connection status)
- ✅ Sidecar process management with auto-restart on failure
- ✅ Silent background service deployment via NSSM
- ✅ Embedded offline documentation with multi-window support
- ✅ Capability-based security model (no broad OS access)

### Installation Package
- ✅ NSIS-based silent installer with comprehensive error handling
- ✅ Automated dependency provisioning (Node.js, Python, Ollama)
- ✅ Pre/post-installation lifecycle hooks
- ✅ Environment variable configuration with fallback paths
- ✅ Service registration and auto-restart on reboot
- ✅ Installation logging and rollback support
- ✅ Admin elevation enforcement
- ✅ Firewall rule verification

### Roku Guest Integration
- ✅ SSDP/UPnP device discovery over local network
- ✅ ECP (External Control Protocol) REST API integration
- ✅ D₈ dihedral group mathematics for focus navigation
- ✅ Deterministic state synchronization (<250ms latency)
- ✅ Phase Alignment Score (PAS) monitoring
- ✅ Memory-efficient SceneGraph rendering

### Android Mobile Remote
- ✅ Kotlin SDK with native coroutine support
- ✅ SSDP M-SEARCH device discovery
- ✅ ECP keypress commands with timeout handling
- ✅ RUBIC reversible encryption for command resilience
- ✅ Error callbacks and connection state management
- ✅ Graceful degradation on network failures

### Semantic Streaming Engine
- ✅ Chrome DevTools Protocol (CDP) integration
- ✅ Real-time DOM extraction and high-dimensional mapping
- ✅ 32.C.U.B.I.T. protocol encoding/decoding
- ✅ Adaptive LOD (Level of Detail) downshifting
- ✅ Proactive memory management on constrained devices
- ✅ Network bandwidth optimization

---

## 💻 System Requirements

### Windows Host (Minimum)
- **OS**: Windows 10 or Windows 11
- **CPU**: Intel Core i5 / AMD Ryzen 5 (AVX2 support required)
- **RAM**: 16 GB (32 GB+ recommended for local inference)
- **Storage**: 50 GB free (for AI models)
- **GPU**: NVIDIA (CUDA) or AMD (ROCm) recommended; CPU fallback available
- **.NET Framework**: 4.8+
- **Network**: Gigabit Ethernet or 802.11ac Wi-Fi

### Roku Display Device
- **Model**: Roku Streaming Stick 4K, Roku Premiere+, or newer
- **OS**: Roku OS 9.0+
- **Developer Settings**: Enabled
- **Control by Mobile Apps**: Enabled
- **Network**: Same Wi-Fi network as host

### Android Mobile Remote
- **OS**: Android 8.0+
- **Network**: Same Wi-Fi network as host

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.12.0 (v20 LTS or v22 LTS recommended)
- **pnpm** ≥ 9.0.0 — install with `npm install -g pnpm@9`
- **Rust** ≥ 1.70 (for the Tauri desktop shell)

> **Note — pnpm version matters.**  pnpm 8.0.0 causes `ERR_INVALID_THIS` fetch errors with Node.js 20+.  Always use pnpm ≥ 9 (or the exact version pinned in `package.json`).  If you see those errors, run `npm install -g pnpm@9` and retry.

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/lumenhelixsolutions/NUMO-Roku-Portal-v2.git
cd NUMO-Roku-Portal-v2

# Install all workspace dependencies with pnpm (recommended)
pnpm install

# — OR — with plain npm (also supported via npm workspaces)
npm install
```

### 2. Run the Desktop Development Server

```bash
# Vite-only (browser preview — no Tauri/Rust required)
cd desktop
npm run dev          # http://localhost:5173

# Full Tauri desktop app (requires Rust toolchain)
cd desktop
npm run tauri:dev
```

### 3. Run the BYOS Streaming Server

```bash
cd server
npm run dev          # tsx watch — restarts on file changes
```

### 4. Build for Production

```bash
# Vite frontend bundle
cd desktop
npm run build

# Full Tauri installer (requires Rust toolchain)
cd desktop
npm run tauri:build
```

---

## 🔧 Troubleshooting Dependency Installs

### `ERR_INVALID_THIS` with pnpm

**Cause:** pnpm 8.0.0 has a known incompatibility with Node.js 20+ — its internal HTTP fetch implementation calls methods on the wrong `this` context.

**Fix:**
```bash
npm install -g pnpm@9           # upgrade to pnpm 9.x
pnpm store prune                # clear stale cache
pnpm install
```

### `npm install` only audits 1 package

**Cause:** Running `npm install` at the repository root with an old version of this repo would only see the root `package.json` (which had no dependencies), because npm ignores `pnpm-workspace.yaml`.

**Fix (already applied):** The root `package.json` now includes a `"workspaces"` field so `npm install` traverses `desktop/` and `server/` automatically.

### Stale lock files / cache corruption

```bash
# Remove all installed modules and lock files, then reinstall
rm -rf node_modules desktop/node_modules server/node_modules
rm -f pnpm-lock.yaml package-lock.json
pnpm store prune
pnpm install
```

---

## 🏗 Project Structure

```
NUMO-Roku-Portal-v2/
├── desktop/                    # Tauri + React desktop application
│   ├── src/
│   │   ├── components/         # UI components (Dashboard, Devices, Apps, Settings)
│   │   ├── lib/
│   │   │   └── roku.ts         # ECP service layer (discovery, device info, key control)
│   │   └── App.tsx             # Root component with centralized state
│   └── src-tauri/              # Rust/Tauri shell
├── server/                     # NUMO BYOS Semantic Streaming Server (Node.js/TypeScript)
│   └── src/
│       ├── ai/                 # Ollama AI router + Agent Zero sidecar
│       ├── navigation/         # D₈ D-pad navigation, PAS monitor, NUMO Field
│       ├── semantic/           # CDP engine, 64-D manifold builder
│       └── sync/               # RUBIC-224 cipher, 32.C.U.B.I.T. framing
├── roku/                       # Roku BrightScript Thin Client
│   ├── source/                 # Channel entry point (main.brs)
│   └── components/             # SceneGraph scene, StreamTask, RUBIC + CUBIT decoders
├── pnpm-workspace.yaml         # PNPM workspace configuration
└── README.md
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 (Rust) |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS v3 |
| Build tool | Vite |
| Device protocol | Roku ECP (HTTP/XML) |
| Mobile remote | Kotlin (Android) |

---

## 📄 License

Copyright © Lumen Helix Solutions. All rights reserved.
