# NUMO-Roku-Portal-v2

<p align="center">
  <a href="https://lumenhelix.com">
    <img src="docs/assets/lumenhelix-logo.svg" alt="LumenHelix Solutions" width="180">
  </a>
</p>

<h3 align="center">Cross-platform Roku device management and semantic streaming suite</h3>

<p align="center">
  <a href="https://lumenhelixsolutions.github.io/NUMO-Roku-Portal-v2/">
    <img src="https://img.shields.io/badge/Launch_Page-NUMO-Roku-Portal-v2-00D4FF?style=flat-square&logo=githubpages&logoColor=white" alt="Launch Page">
  </a>
  <a href="https://lumenhelix.com">
    <img src="https://img.shields.io/badge/Built_by-LumenHelix-7C3AED?style=flat-square" alt="Built by LumenHelix">
  </a>
  <img src="https://img.shields.io/badge/license-MIT-8A95A8?style=flat-square" alt="License">
</p>

---

**NUMO-Roku-Portal-v2** is part of the [LumenHelix Solutions](https://lumenhelix.com) portfolio — applied symbolic dynamics & reversible computation for deterministic, traceable AI systems.

NUMO-Roku-Portal-v2 is the LumenHelix cross-platform device management suite for Roku streaming. It combines a Tauri v2 desktop launcher, a Node.js BYOS semantic streaming server, a BrightScript Roku thin client, and a Kotlin Android remote — all communicating through RUBIC-encrypted 32.C.U.B.I.T. frames.

## Why this exists

- **Own the pipeline.** Host the streaming server locally with no required cloud intermediary.
- **Secure by design.** Capability-based Tauri permissions and RUBIC-224 command encryption.
- **Extend to any screen.** Add Roku channels, Android remotes, or new semantic adapters without rewriting the core.

## Quick start

Install and run NUMO-Roku-Portal-v2 in under two minutes.

### macOS / Linux

```bash
# Clone
git clone https://github.com/lumenhelixsolutions/NUMO-Roku-Portal-v2.git
cd NUMO-Roku-Portal-v2

# Install & run
git clone https://github.com/lumenhelixsolutions/NUMO-Roku-Portal-v2.git
cd NUMO-Roku-Portal-v2
pnpm install
cd desktop && npm run dev
```

### Windows (PowerShell)

```powershell
# Clone
git clone https://github.com/lumenhelixsolutions/NUMO-Roku-Portal-v2.git
Set-Location NUMO-Roku-Portal-v2

# Install & run
git clone https://github.com/lumenhelixsolutions/NUMO-Roku-Portal-v2.git
Set-Location NUMO-Roku-Portal-v2
pnpm install
cd desktop
npm run dev
```

### Windows (Git Bash / WSL)

```bash
git clone https://github.com/lumenhelixsolutions/NUMO-Roku-Portal-v2.git
cd NUMO-Roku-Portal-v2
git clone https://github.com/lumenhelixsolutions/NUMO-Roku-Portal-v2.git
cd NUMO-Roku-Portal-v2
pnpm install
cd desktop && npm run dev
```

> **Device note:** NUMO-Roku-Portal-v2 is tested on Windows 11, macOS Sonoma, Ubuntu 22.04/24.04, and modern mobile browsers.

## Full documentation

Visit the launch page for architecture, API reference, and deployment guides:  
**https://lumenhelixsolutions.github.io/NUMO-Roku-Portal-v2/**

## Features

| Feature | What it gives you |
|---------|-------------------|
| Tauri desktop launcher | React + Tailwind onboarding, telemetry dashboard, sidecar management, and silent NSSM service deployment. |
| BYOS semantic server | Chrome DevTools Protocol capture, 64-D manifold mapping, RUBIC-encrypted CUBIT frames over WebSocket. |
| Roku thin client | BrightScript SceneGraph channel that receives encrypted frames and renders interactive overlays at 32 Hz. |
| Kotlin Android remote | SSDP discovery, ECP keypress commands, RUBIC reversible encryption, and graceful network degradation. |

## Architecture at a glance

```
NUMO-Roku-Portal-v2/
├── desktop/     Tauri v2 + React + Vite — Windows launcher
├── server/      Node.js/TypeScript BYOS semantic streaming engine
├── roku/        BrightScript SceneGraph thin client
└── android/     Kotlin SDK and mobile remote
```

## Development

```bash
# Desktop Vite preview (no Rust required)
cd desktop
npm run dev

# Full Tauri desktop app
cd desktop
npm run tauri:dev

# BYOS server
cd server
npm run dev
```

## Roadmap

- [ ] Plug-and-play semantic adapter marketplace
- [ ] Headless installer and auto-update channel
- [ ] Cross-platform Android remote publishing pipeline

## Support & consulting

Need deterministic AI systems with full traceability? LumenHelix builds reversible computation kernels, governance layers, and end-to-end AI integrations.

- **Website:** https://lumenhelix.com
- **Services:** AI diagnostics, B.Y.O. support packages, governance audits
- **Research:** TEN² kernel, R.U.B.I.C. boundary discipline, C.O.R.E. constraint lens

## License

Released under the MIT License.

---

<p align="center">
  <sub>Engineered by <a href="https://lumenhelix.com">LumenHelix Solutions</a> — Applied Symbolic Dynamics & Reversible Computation.</sub>
</p>
