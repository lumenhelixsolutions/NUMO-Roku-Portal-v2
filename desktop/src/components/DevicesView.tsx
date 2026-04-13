import { useEffect, useState } from 'react'
import { fetchActiveApp, sendKey, type RokuDeviceInfo, type RokuApp } from '../lib/roku'

interface DevicesViewProps {
  devices: RokuDeviceInfo[]
  selectedIp: string | null
  onSelectDevice: (ip: string) => void
  scanning: boolean
  scanProgress: number
  scanTotal: number
  onScan: () => void
  onRefresh: () => void
  onStatusMessage: (msg: string) => void
}

const KEY_BUTTONS: { label: string; key: string; icon: string }[] = [
  { label: 'Home', key: 'Home', icon: '🏠' },
  { label: 'Volume Up', key: 'VolumeUp', icon: '🔊' },
  { label: 'Volume Down', key: 'VolumeDown', icon: '🔉' },
  { label: 'Mute', key: 'VolumeMute', icon: '🔇' },
  { label: 'Power Off', key: 'PowerOff', icon: '⏻' },
]

function DeviceDetail({ device, onStatusMessage }: { device: RokuDeviceInfo; onStatusMessage: (m: string) => void }) {
  const [activeApp, setActiveApp] = useState<RokuApp | null>(null)
  const [sendingKey, setSendingKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchActiveApp(device.ip).then((app) => { if (!cancelled) setActiveApp(app) }).catch(() => {})
    return () => { cancelled = true }
  }, [device.ip])

  async function handleKey(key: string) {
    setSendingKey(key)
    try {
      await sendKey(device.ip, key)
      onStatusMessage(`Sent: ${key}`)
    } catch {
      onStatusMessage(`Failed to send key: ${key}`)
    } finally {
      setSendingKey(null)
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white">{device.friendlyName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{device.ip}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Online
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs border-t border-slate-700 pt-3">
        {[
          { label: 'Model', value: device.modelName },
          { label: 'Model #', value: device.modelNumber },
          { label: 'Serial', value: device.serialNumber },
          { label: 'SW Version', value: device.softwareVersion },
          { label: 'Now Playing', value: activeApp?.name ?? '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <span className="text-slate-500">{label}: </span>
            <span className="text-slate-300">{value || '—'}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700 pt-3">
        <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Remote Control</p>
        <div className="flex flex-wrap gap-2">
          {KEY_BUTTONS.map(({ label, key, icon }) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              disabled={sendingKey !== null}
              title={label}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs rounded-lg transition-colors"
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DevicesView({
  devices,
  selectedIp,
  onSelectDevice,
  scanning,
  scanProgress,
  scanTotal,
  onScan,
  onRefresh,
  onStatusMessage,
}: DevicesViewProps) {
  const selectedDevice = devices.find((d) => d.ip === selectedIp) ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Devices</h2>
          <p className="text-sm text-slate-400 mt-0.5">Roku devices on your local network.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg font-medium transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            onClick={onScan}
            disabled={scanning}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-sm rounded-lg font-medium transition-colors"
          >
            {scanning ? '⏳ Scanning…' : '🔍 Scan Network'}
          </button>
        </div>
      </div>

      {/* Scan progress bar */}
      {scanning && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Scanning network…</span>
            <span>{scanProgress} / {scanTotal}</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all duration-200"
              style={{ width: `${scanTotal > 0 ? Math.round((scanProgress / scanTotal) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
          <span className="text-4xl">📺</span>
          <div>
            <p className="font-medium text-white">No devices found</p>
            <p className="text-sm mt-1">Scan your network or add a device IP in Settings.</p>
          </div>
          <button
            onClick={onScan}
            disabled={scanning}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            🔍 Scan Network
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* Device list */}
          <div className="grid grid-cols-2 gap-3">
            {devices.map((d) => (
              <button
                key={d.ip}
                onClick={() => onSelectDevice(d.ip)}
                className={`text-left bg-slate-800 border rounded-xl p-4 transition-colors ${
                  d.ip === selectedIp
                    ? 'border-sky-500/60 ring-1 ring-sky-500/30'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📺</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{d.friendlyName}</p>
                    <p className="text-xs text-slate-400 truncate">{d.modelName} · {d.ip}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Selected device detail */}
          {selectedDevice && (
            <DeviceDetail device={selectedDevice} onStatusMessage={onStatusMessage} />
          )}
        </div>
      )}
    </div>
  )
}


