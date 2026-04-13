import { useState, useEffect, useCallback } from 'react'
import TopNav from './components/TopNav'
import Sidebar from './components/Sidebar'
import RokuDeviceCard from './components/RokuDeviceCard'
import DevicesView from './components/DevicesView'
import AppsView from './components/AppsView'
import SettingsView from './components/SettingsView'
import { fetchDeviceInfo, scanSubnet, type RokuDeviceInfo } from './lib/roku'
import './App.css'

type NavSection = 'dashboard' | 'devices' | 'apps' | 'settings'

const LS_KEY = 'numo_known_ips'

const DEFAULT_SETTINGS = {
  networkDiscovery: true,
  darkMode: true,
  notifications: true,
  autoUpdate: false,
  diagnostics: false,
  lowBandwidth: false,
}

function loadKnownIps(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveKnownIps(ips: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ips))
}

function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  // ── Real device state ──────────────────────────────────────────────────────
  const [devices, setDevices] = useState<RokuDeviceInfo[]>([])
  const [selectedIp, setSelectedIp] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanTotal, setScanTotal] = useState(254)
  const [dashboardAppCount, setDashboardAppCount] = useState(0)

  // Load saved IPs on mount and resolve device info

  useEffect(() => {
    const ips = loadKnownIps()
    if (ips.length === 0) return
    Promise.allSettled(ips.map((ip) => fetchDeviceInfo(ip))).then((results) => {
      const resolved = results
        .filter((r): r is PromiseFulfilledResult<RokuDeviceInfo> => r.status === 'fulfilled')
        .map((r) => r.value)
      setDevices(resolved)
      // Auto-select the first device only on initial load, not on subsequent refreshes
      setSelectedIp((prev) => (prev === null && resolved.length > 0 ? resolved[0].ip : prev))
    })
  }, []) // intentionally empty — runs once on mount

  function showStatus(msg: string) {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(null), 3500)
  }

  // ── Device management ──────────────────────────────────────────────────────

  const addDeviceIp = useCallback(async (ip: string): Promise<void> => {
    const info = await fetchDeviceInfo(ip) // throws if unreachable
    setDevices((prev) => {
      if (prev.find((d) => d.ip === ip)) return prev
      const next = [...prev, info]
      saveKnownIps(next.map((d) => d.ip))
      return next
    })
    setSelectedIp((prev) => prev ?? ip)
    showStatus(`Added ${info.friendlyName}`)
  }, [])

  const removeDeviceIp = useCallback((ip: string) => {
    setDevices((prev) => {
      const next = prev.filter((d) => d.ip !== ip)
      saveKnownIps(next.map((d) => d.ip))
      return next
    })
    setSelectedIp((prev) => (prev === ip ? null : prev))
  }, [])

  const refreshDevices = useCallback(async () => {
    showStatus('Refreshing device list…')
    const ips = devices.map((d) => d.ip)
    if (ips.length === 0) { showStatus('No saved devices. Scan or add an IP first.'); return }
    const results = await Promise.allSettled(ips.map((ip) => fetchDeviceInfo(ip)))
    const resolved = results
      .filter((r): r is PromiseFulfilledResult<RokuDeviceInfo> => r.status === 'fulfilled')
      .map((r) => r.value)
    setDevices(resolved)
    showStatus(`${resolved.length} device${resolved.length !== 1 ? 's' : ''} online`)
  }, [devices])

  const scanNetwork = useCallback(async () => {
    if (scanning) return
    setScanning(true)
    setScanProgress(0)

    // Infer subnet from existing devices, otherwise try common subnets
    const existingSubnets = [...new Set(devices.map((d) => d.ip.split('.').slice(0, 3).join('.')))]
    const subnets = existingSubnets.length > 0 ? existingSubnets : ['192.168.1', '192.168.0']
    setScanTotal(subnets.length * 254)

    let totalScanned = 0
    const newIps: string[] = []

    for (const subnet of subnets) {
      await scanSubnet(
        subnet,
        (ip) => {
          newIps.push(ip)
          // probeDevice already confirmed port 8060 is open; addDeviceIp may still fail
          // if the device info endpoint returns unexpected data — silently skip those.
          addDeviceIp(ip).catch(() => {})
        },
        (scanned) => {
          totalScanned = scanned
          setScanProgress(totalScanned)
        },
      )
    }

    setScanning(false)
    showStatus(newIps.length > 0 ? `Found ${newIps.length} Roku device(s)` : 'No Roku devices found')
  }, [scanning, devices, addDeviceIp])

  function handleOpenSettings() {
    setActiveSection('settings')
  }

  function toggleSetting(key: keyof typeof DEFAULT_SETTINGS) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const selectedDevice = devices.find((d) => d.ip === selectedIp) ?? null

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      <TopNav onSettingsClick={handleOpenSettings} deviceCount={devices.length} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeSection={activeSection} onNavigate={setActiveSection} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Toast */}
          {statusMessage && (
            <div className="fixed top-16 right-6 z-50 px-4 py-3 bg-sky-600 text-white rounded-lg shadow-lg text-sm">
              {statusMessage}
            </div>
          )}

          {activeSection === 'dashboard' && (
            <>
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-sky-900/50 to-slate-800/50 border border-sky-800/40 rounded-xl p-6">
                <h1 className="text-2xl font-bold text-white mb-1">
                  Welcome to NUMO Roku Portal
                </h1>
                <p className="text-slate-400 text-sm">
                  Manage your Roku devices, deploy apps, and monitor your streaming fleet from one place.
                </p>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Devices Online', value: String(devices.length), icon: '📺', color: 'text-emerald-400' },
                  { label: 'Apps Installed', value: String(dashboardAppCount), icon: '🎬', color: 'text-sky-400' },
                  { label: 'Alerts', value: '0', icon: '🔔', color: 'text-amber-400' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                    <span className="text-3xl">{stat.icon}</span>
                    <div>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-slate-400 text-xs">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-2 gap-6">
                <RokuDeviceCard
                  device={selectedDevice}
                  onRefresh={refreshDevices}
                  onScan={scanNetwork}
                  onAppCountChange={setDashboardAppCount}
                />

                {/* Quick Actions */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
                  <h3 className="font-semibold text-white text-sm">Quick Actions</h3>
                  {[
                    { label: 'Refresh Devices', icon: '🔄', handler: refreshDevices, primary: true },
                    { label: 'Scan Network', icon: '🔍', handler: scanNetwork, primary: false },
                    { label: 'Open Settings', icon: '⚙️', handler: handleOpenSettings, primary: false },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={action.handler}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        action.primary
                          ? 'bg-sky-600 hover:bg-sky-500 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      }`}
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'devices' && (
            <DevicesView
              devices={devices}
              selectedIp={selectedIp}
              onSelectDevice={setSelectedIp}
              scanning={scanning}
              scanProgress={scanProgress}
              scanTotal={scanTotal}
              onScan={scanNetwork}
              onRefresh={refreshDevices}
              onStatusMessage={showStatus}
            />
          )}

          {activeSection === 'apps' && (
            <AppsView
              devices={devices}
              selectedIp={selectedIp}
              onSelectDevice={setSelectedIp}
              onStatusMessage={showStatus}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              settings={settings}
              onToggle={toggleSetting}
              onStatusMessage={showStatus}
              devices={devices}
              onAddDevice={addDeviceIp}
              onRemoveDevice={removeDeviceIp}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App

