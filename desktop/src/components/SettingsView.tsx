import { useState } from 'react'
import type { RokuDeviceInfo } from '../lib/roku'

interface SettingsState {
  networkDiscovery: boolean
  darkMode: boolean
  notifications: boolean
  autoUpdate: boolean
  diagnostics: boolean
  lowBandwidth: boolean
}

interface SettingsViewProps {
  settings: SettingsState
  onToggle: (key: keyof SettingsState) => void
  onStatusMessage: (msg: string) => void
  devices: RokuDeviceInfo[]
  onAddDevice: (ip: string) => Promise<void>
  onRemoveDevice: (ip: string) => void
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string
  description: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-700 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-sky-600' : 'bg-slate-600'}`}
        aria-pressed={checked}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  )
}

export default function SettingsView({
  settings,
  onToggle,
  onStatusMessage,
  devices,
  onAddDevice,
  onRemoveDevice,
}: SettingsViewProps) {
  const [manualIp, setManualIp] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function handleAddDevice() {
    const ip = manualIp.trim()
    if (!ip) return
    setAdding(true)
    setAddError(null)
    try {
      await onAddDevice(ip)
      setManualIp('')
      onStatusMessage(`Device at ${ip} added.`)
    } catch {
      setAddError(`Could not reach a Roku device at ${ip}. Verify the IP and that port 8060 is reachable.`)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-sm text-slate-400 mt-0.5">Configure your NUMO Roku Portal preferences.</p>
      </div>

      {/* Network */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">🌐 Network</h3>
        </div>
        <div className="px-6 divide-y divide-slate-700">
          <ToggleRow
            label="Network Discovery"
            description="Auto-scan the local network for Roku devices on startup."
            checked={settings.networkDiscovery}
            onToggle={() => onToggle('networkDiscovery')}
          />
          <ToggleRow
            label="Low Bandwidth Mode"
            description="Reduce polling frequency when on a metered connection."
            checked={settings.lowBandwidth}
            onToggle={() => onToggle('lowBandwidth')}
          />

          {/* Manual IP entry */}
          <div className="py-3.5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-white">Manual Device IP</p>
                <p className="text-xs text-slate-400 mt-0.5">Add a Roku device by IP address directly.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualIp}
                onChange={(e) => { setManualIp(e.target.value); setAddError(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddDevice() }}
                placeholder="e.g. 192.168.1.105"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
              <button
                onClick={handleAddDevice}
                disabled={adding || !manualIp.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {adding ? '…' : 'Add'}
              </button>
            </div>
            {addError && (
              <p className="text-xs text-red-400 mt-2">⚠️ {addError}</p>
            )}
          </div>

          {/* Saved device list */}
          {devices.length > 0 && (
            <div className="py-3.5 space-y-2">
              <p className="text-sm font-medium text-white mb-2">Saved Devices</p>
              {devices.map((d) => (
                <div
                  key={d.ip}
                  className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{d.friendlyName}</p>
                    <p className="text-xs text-slate-500">{d.ip} · {d.modelName}</p>
                  </div>
                  <button
                    onClick={() => { onRemoveDevice(d.ip); onStatusMessage(`Removed ${d.friendlyName}`) }}
                    className="ml-3 text-xs text-red-400 hover:text-red-300 shrink-0 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Appearance */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">🎨 Appearance</h3>
        </div>
        <div className="px-6 divide-y divide-slate-700">
          <ToggleRow
            label="Dark Mode"
            description="Use the dark theme across the portal (recommended)."
            checked={settings.darkMode}
            onToggle={() => onToggle('darkMode')}
          />
        </div>
      </section>

      {/* Notifications & Updates */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">🔔 Notifications &amp; Updates</h3>
        </div>
        <div className="px-6 divide-y divide-slate-700">
          <ToggleRow
            label="Device Notifications"
            description="Show alerts for device status changes (online/offline)."
            checked={settings.notifications}
            onToggle={() => onToggle('notifications')}
          />
          <ToggleRow
            label="Auto-Update Apps"
            description="Automatically update installed channels when new versions are available."
            checked={settings.autoUpdate}
            onToggle={() => onToggle('autoUpdate')}
          />
        </div>
      </section>

      {/* Privacy & Diagnostics */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">🔒 Privacy &amp; Diagnostics</h3>
        </div>
        <div className="px-6 divide-y divide-slate-700">
          <ToggleRow
            label="Diagnostics"
            description="Send anonymous usage data to help improve the portal."
            checked={settings.diagnostics}
            onToggle={() => onToggle('diagnostics')}
          />
        </div>
      </section>

      {/* About */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">ℹ️ About</h3>
        </div>
        <div className="px-6 py-4 space-y-2 text-sm">
          {[
            { label: 'Application', value: 'NUMO Roku Portal' },
            { label: 'Version', value: '2.0.0' },
            { label: 'Built with', value: 'React · Vite · Tailwind CSS · Tauri' },
            { label: 'Developer', value: 'Lumen Helix Solutions' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-slate-700/60 last:border-0">
              <span className="text-slate-400">{label}</span>
              <span className="text-slate-200">{value}</span>
            </div>
          ))}
          <div className="pt-3">
            <button
              onClick={() => onStatusMessage('Checking for updates…')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors"
            >
              🔄 Check for Updates
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
