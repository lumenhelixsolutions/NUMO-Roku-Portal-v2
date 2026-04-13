import { useEffect, useState } from 'react'
import { fetchActiveApp, type RokuDeviceInfo, type RokuApp } from '../lib/roku'

interface RokuDeviceCardProps {
  device: RokuDeviceInfo | null
  onRefresh: () => void
  onScan: () => void
  onAppCountChange?: (count: number) => void
}

export default function RokuDeviceCard({ device, onRefresh, onScan, onAppCountChange }: RokuDeviceCardProps) {
  const [activeApp, setActiveApp] = useState<RokuApp | null>(null)

  useEffect(() => {
    if (!device) {
      setActiveApp(null)
      return
    }

    let cancelled = false
    async function poll() {
      if (!device) return
      const app = await fetchActiveApp(device.ip).catch(() => null)
      if (!cancelled) setActiveApp(app)
    }
    poll()
    const id = setInterval(poll, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [device])

  // Notify parent of app count (0 or 1 for dashboard stat)
  useEffect(() => {
    onAppCountChange?.(activeApp ? 1 : 0)
  }, [activeApp, onAppCountChange])

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-xl">
            📺
          </div>
          <div>
            {device ? (
              <>
                <h3 className="font-semibold text-white text-sm">{device.friendlyName}</h3>
                <p className="text-xs text-slate-400">{device.modelName} · {device.ip}</p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-white text-sm">No Device Connected</h3>
                <p className="text-xs text-slate-400">Scan your network to find Roku devices</p>
              </>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
            device
              ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400'
              : 'bg-slate-700/50 border-slate-600/50 text-slate-400'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${device ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          {device ? 'Online' : 'Not Connected'}
        </span>
      </div>

      {/* Device details */}
      {device && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {[
            { label: 'Model #', value: device.modelNumber },
            { label: 'Serial', value: device.serialNumber },
            { label: 'SW Version', value: device.softwareVersion },
            { label: 'Now Playing', value: activeApp?.name ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="text-slate-500">{label}: </span>
              <span className="text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onRefresh}
          className="flex-1 py-2 px-3 text-sm bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors"
        >
          🔄 Refresh
        </button>
        <button
          onClick={onScan}
          className="flex-1 py-2 px-3 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
        >
          🔍 Scan
        </button>
      </div>
    </div>
  )
}
