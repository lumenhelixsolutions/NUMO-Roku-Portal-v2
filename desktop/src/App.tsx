import { useState, useEffect, useCallback, useRef } from 'react'
import TopNav from './components/TopNav'
import Sidebar from './components/Sidebar'
import RokuDeviceCard from './components/RokuDeviceCard'
import DevicesView from './components/DevicesView'
import AppsView from './components/AppsView'
import SettingsView from './components/SettingsView'
import ActivityLog, { type ActivityEntry } from './components/ActivityLog'
import { fetchDeviceInfo, fetchApps, scanSubnet, type RokuDeviceInfo } from './lib/roku'
import './App.css'

type NavSection = 'dashboard' | 'devices' | 'apps' | 'settings'

const LS_KEY = 'numo_known_ips'
const LS_SETTINGS_KEY = 'numo_settings'
const LS_SELECTED_IP_KEY = 'numo_selected_ip'

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

function loadSettings(): typeof DEFAULT_SETTINGS {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_SETTINGS_KEY) ?? 'null')
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(s: typeof DEFAULT_SETTINGS) {
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s))
}

function loadSelectedIp(): string | null {
  return localStorage.getItem(LS_SELECTED_IP_KEY)
}

function selectInitialDevice(savedIp: string | null, resolved: RokuDeviceInfo[]): string | null {
  if (savedIp && resolved.find((d) => d.ip === savedIp)) return savedIp
  return resolved.length > 0 ? resolved[0].ip : null
}

function saveSelectedIp(ip: string | null) {
  if (ip) localStorage.setItem(LS_SELECTED_IP_KEY, ip)
  else localStorage.removeItem(LS_SELECTED_IP_KEY)
}

function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [settings, setSettings] = useState(loadSettings)

  // ── Real device state ──────────────────────────────────────────────────────
  const [devices, setDevices] = useState<RokuDeviceInfo[]>([])
  const [selectedIp, setSelectedIp] = useState<string | null>(null)
  const [onlineIps, setOnlineIps] = useState<Set<string>>(new Set())
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanTotal, setScanTotal] = useState(254)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [selectedDeviceAppCount, setSelectedDeviceAppCount] = useState<number | null>(null)

  // ── Activity log ──────────────────────────────────────────────────────────
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([])
  const nextLogId = useRef(0)

  const logActivity = useCallback((msg: string) => {
    const entry: ActivityEntry = { id: nextLogId.current++, timestamp: new Date(), message: msg }
    setActivityLog((prev) => [entry, ...prev].slice(0, 100))
  }, [])

  // Ref so the startup effect can call the latest scanNetwork without being in its dep array
  const scanNetworkRef = useRef<() => Promise<void>>(async () => {})

  // ── Persistence effects ────────────────────────────────────────────────────
  useEffect(() => { saveSettings(settings) }, [settings])
  useEffect(() => { saveSelectedIp(selectedIp) }, [selectedIp])

  // ── Fetch app count for selected device ───────────────────────────────────
  useEffect(() => {
    if (!selectedIp) { setSelectedDeviceAppCount(null); return }
    setSelectedDeviceAppCount(null)
    fetchApps(selectedIp)
      .then((list) => setSelectedDeviceAppCount(list.length))
      .catch(() => setSelectedDeviceAppCount(null))
  }, [selectedIp])

  // ── Load saved IPs on mount, restore selected device, optionally auto-scan ─
  useEffect(() => {
    const ips = loadKnownIps()
    const savedIp = loadSelectedIp()
    const autoScan = loadSettings().networkDiscovery

    async function init() {
      if (ips.length > 0) {
        const results = await Promise.allSettled(ips.map((ip) => fetchDeviceInfo(ip)))
        const resolved = results
          .filter((r): r is PromiseFulfilledResult<RokuDeviceInfo> => r.status === 'fulfilled')
          .map((r) => r.value)
        setDevices(resolved)
        setOnlineIps(new Set(resolved.map((d) => d.ip)))
        const restoredIp = selectInitialDevice(savedIp, resolved)
        setSelectedIp(restoredIp)
        if (resolved.length > 0) setLastRefreshTime(new Date())
      }
      if (autoScan) scanNetworkRef.current()
    }

    init()
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
    setOnlineIps((prev) => new Set([...prev, ip]))
    setSelectedIp((prev) => prev ?? ip)
    showStatus(`Added ${info.friendlyName}`)
    logActivity(`Added device: ${info.friendlyName} (${ip})`)
  }, [logActivity])

  const removeDeviceIp = useCallback((ip: string) => {
    setDevices((prev) => {
      const next = prev.filter((d) => d.ip !== ip)
      saveKnownIps(next.map((d) => d.ip))
      return next
    })
    setOnlineIps((prev) => { const next = new Set(prev); next.delete(ip); return next })
    setSelectedIp((prev) => (prev === ip ? null : prev))
    logActivity(`Removed device: ${ip}`)
  }, [logActivity])

  const refreshDevices = useCallback(async () => {
    showStatus('Refreshing device list…')
    const ips = devices.map((d) => d.ip)
    if (ips.length === 0) { showStatus('No saved devices. Scan or add an IP first.'); return }
    const results = await Promise.allSettled(ips.map((ip) => fetchDeviceInfo(ip)))
    const resolved = results
      .filter((r): r is PromiseFulfilledResult<RokuDeviceInfo> => r.status === 'fulfilled')
      .map((r) => r.value)
    setDevices(resolved)
    setOnlineIps(new Set(resolved.map((d) => d.ip)))
    setLastRefreshTime(new Date())
    const msg = `${resolved.length} device${resolved.length !== 1 ? 's' : ''} online`
    showStatus(msg)
    logActivity(`Refreshed: ${msg}`)
  }, [devices, logActivity])

  const scanNetwork = useCallback(async () => {
    if (scanning) return
    setScanning(true)
    setScanProgress(0)
    logActivity('Network scan started')

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
          // Skip IPs that are already tracked to avoid redundant fetches.
          // probeDevice already confirmed this is a real Roku device; addDeviceIp
          // may still fail if the device disappears between probe and fetch.
          if (!devices.find((d) => d.ip === ip)) {
            addDeviceIp(ip).catch(() => {})
          }
        },
        (scanned) => {
          totalScanned = scanned
          setScanProgress(totalScanned)
        },
      )
    }

    setScanning(false)
    const msg = newIps.length > 0 ? `Found ${newIps.length} Roku device(s)` : 'No Roku devices found'
    showStatus(msg)
    logActivity(`Scan complete: ${msg}`)
  }, [scanning, devices, addDeviceIp, logActivity])

  // Keep ref pointing at the latest scanNetwork for the startup auto-scan
  useEffect(() => { scanNetworkRef.current = scanNetwork }, [scanNetwork])

  function handleOpenSettings() {
    setActiveSection('settings')
  }

  function toggleSetting(key: keyof typeof DEFAULT_SETTINGS) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const selectedDevice = devices.find((d) => d.ip === selectedIp) ?? null

  const lastRefreshedLabel = lastRefreshTime
    ? lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Never'

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
                  { label: 'Apps Installed', value: selectedDeviceAppCount !== null ? String(selectedDeviceAppCount) : '—', icon: '🎬', color: 'text-sky-400' },
                  { label: 'Last Refreshed', value: lastRefreshedLabel, icon: '🕒', color: 'text-amber-400' },
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

              {/* Activity Log */}
              <ActivityLog entries={activityLog} />
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
              onlineIps={onlineIps}
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

