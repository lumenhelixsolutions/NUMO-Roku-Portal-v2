import { useEffect, useState } from 'react'
import { fetchApps, launchApp, iconUrl, type RokuDeviceInfo, type RokuApp } from '../lib/roku'

interface AppsViewProps {
  devices: RokuDeviceInfo[]
  selectedIp: string | null
  onSelectDevice: (ip: string) => void
  onStatusMessage: (msg: string) => void
}

export default function AppsView({ devices, selectedIp, onSelectDevice, onStatusMessage }: AppsViewProps) {
  const [apps, setApps] = useState<RokuApp[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launching, setLaunching] = useState<string | null>(null)
  const [iconErrors, setIconErrors] = useState<Set<string>>(new Set())

  const activeIp = selectedIp ?? devices[0]?.ip ?? null

  useEffect(() => {
    if (!activeIp) { setApps([]); setIconErrors(new Set()); return }
    setLoading(true)
    setError(null)
    setIconErrors(new Set())
    fetchApps(activeIp)
      .then((list) => setApps(list))
      .catch(() => setError('Could not load apps. Ensure the device is reachable on port 8060.'))
      .finally(() => setLoading(false))
  }, [activeIp])

  async function handleLaunch(app: RokuApp) {
    if (!activeIp) return
    setLaunching(app.id)
    try {
      await launchApp(activeIp, app.id)
      onStatusMessage(`Launched ${app.name}`)
    } catch {
      onStatusMessage(`Failed to launch ${app.name}`)
    } finally {
      setLaunching(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Apps &amp; Channels</h2>
          <p className="text-sm text-slate-400 mt-0.5">Installed channels on your Roku device.</p>
        </div>

        {/* Device selector */}
        {devices.length > 1 && (
          <select
            value={activeIp ?? ''}
            onChange={(e) => onSelectDevice(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          >
            {devices.map((d) => (
              <option key={d.ip} value={d.ip}>{d.friendlyName} ({d.ip})</option>
            ))}
          </select>
        )}
      </div>

      {!activeIp ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
          <span className="text-4xl">🎬</span>
          <div>
            <p className="font-medium text-white">No device selected</p>
            <p className="text-sm mt-1">Connect a Roku device to view its installed channels.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <span className="text-3xl animate-pulse">🎬</span>
          <p className="text-sm">Loading channels…</p>
        </div>
      ) : error ? (
        <div className="bg-slate-800 border border-red-800/50 rounded-xl p-6 text-center space-y-2">
          <p className="text-red-400 font-medium">⚠️ {error}</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
          <span className="text-4xl">🎬</span>
          <p className="font-medium text-white">No channels found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="w-full h-16 mb-2 flex items-center justify-center rounded-lg bg-slate-900 overflow-hidden">
                  {!iconErrors.has(app.id) && (
                    <img
                      src={iconUrl(activeIp!, app.id)}
                      alt={app.name}
                      onError={() => setIconErrors((prev) => new Set([...prev, app.id]))}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                <p className="font-semibold text-white text-sm">{app.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  v{app.version}{app.type ? ` · ${app.type}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleLaunch(app)}
                disabled={launching !== null}
                className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {launching === app.id ? '⏳ Launching…' : '▶ Launch'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
