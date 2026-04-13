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

### 1. Download & Install

```bash
# Clone the repository
git clone https://github.com/lumenhelixsolutions/NUMO-Roku-Portal-v2.git
cd NUMO-Roku-Portal-v2

# Install dependencies
npm install

# Install Rust dependencies (for desktop)
cd desktop/src-tauri && cargo build --release
cd ../..
```

### 2. Run the Development Server

```bash
cd desktop
npm run dev
```

### 3. Build for Production

```bash
cd desktop
npm run build
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
