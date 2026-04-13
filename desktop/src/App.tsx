import { useState } from 'react'
import TopNav from './components/TopNav'
import Sidebar from './components/Sidebar'
import RokuDeviceCard from './components/RokuDeviceCard'
import './App.css'

type NavSection = 'dashboard' | 'devices' | 'apps' | 'settings'

const DEFAULT_SETTINGS = {
  networkDiscovery: true,
  darkMode: true,
  notifications: true,
}

function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  function showStatus(msg: string) {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(null), 3000)
  }

  function handleRefreshDevices() {
    showStatus('Refreshing device list…')
  }

  function handleScanNetwork() {
    showStatus('Scanning local network for Roku devices…')
  }

  function handleOpenSettings() {
    setActiveSection('settings')
  }

  function toggleSetting(key: keyof typeof DEFAULT_SETTINGS) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      <TopNav onSettingsClick={handleOpenSettings} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeSection={activeSection} onNavigate={setActiveSection} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Toast */}
          {statusMessage && (
            <div className="fixed top-16 right-6 z-50 px-4 py-3 bg-sky-600 text-white rounded-lg shadow-lg text-sm animate-pulse">
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
                  { label: 'Devices Online', value: '1', icon: '📺', color: 'text-emerald-400' },
                  { label: 'Apps Installed', value: '3', icon: '🎬', color: 'text-sky-400' },
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
                <RokuDeviceCard onRefresh={handleRefreshDevices} onScan={handleScanNetwork} />

                {/* Quick Actions */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
                  <h3 className="font-semibold text-white text-sm">Quick Actions</h3>
                  {[
                    { label: 'Refresh Devices', icon: '🔄', handler: handleRefreshDevices, primary: true },
                    { label: 'Scan Network', icon: '🔍', handler: handleScanNetwork, primary: false },
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
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Devices</h2>
              <RokuDeviceCard onRefresh={handleRefreshDevices} onScan={handleScanNetwork} />
            </div>
          )}

          {activeSection === 'apps' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Apps</h2>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center text-slate-400">
                <p className="text-4xl mb-3">🎬</p>
                <p className="font-medium">No apps deployed yet</p>
                <p className="text-sm mt-1">Connect a Roku device to browse and deploy channels.</p>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
                {(
                  [
                    { key: 'networkDiscovery' as const, label: 'Network Discovery', description: 'Auto-scan local network for Roku devices on startup' },
                    { key: 'darkMode' as const, label: 'Dark Mode', description: 'Use dark theme (default)' },
                    { key: 'notifications' as const, label: 'Notifications', description: 'Show alerts for device status changes' },
                  ] as const
                ).map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{setting.label}</p>
                      <p className="text-xs text-slate-400">{setting.description}</p>
                    </div>
                    <button
                      onClick={() => toggleSetting(setting.key)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${settings[setting.key] ? 'bg-sky-600' : 'bg-slate-600'}`}
                      aria-pressed={settings[setting.key]}
                      aria-label={`Toggle ${setting.label}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[setting.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App

