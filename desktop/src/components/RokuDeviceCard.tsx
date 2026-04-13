import { useState } from 'react'

interface RokuDeviceCardProps {
  onRefresh: () => void
  onScan: () => void
}

export default function RokuDeviceCard({ onRefresh, onScan }: RokuDeviceCardProps) {
  const [volume, setVolume] = useState(60)
  const [muted, setMuted] = useState(false)
  const [activeApp, setActiveApp] = useState('Netflix')

  function adjustVolume(delta: number) {
    setVolume((v) => Math.min(100, Math.max(0, v + delta)))
    setMuted(false)
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-xl">
            📺
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Living Room TV</h3>
            <p className="text-xs text-slate-400">Roku Ultra (4802R) · Primary Display</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </span>
      </div>

      {/* Now playing */}
      <div className="flex items-center gap-3 bg-slate-900 rounded-lg px-3 py-2.5">
        <span className="text-lg">🎬</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">Now playing</p>
          <p className="text-sm text-slate-200 font-medium truncate">{activeApp}</p>
        </div>
        <button
          onClick={() => setActiveApp('Home')}
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          ⏹ Stop
        </button>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">IP Address</p>
          <p className="text-slate-200 font-mono">192.168.1.101</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">OS Version</p>
          <p className="text-slate-200">12.5.0</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Signal</p>
          <p className="text-slate-200">📶 Strong</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Serial</p>
          <p className="text-slate-200 font-mono text-xs">X12345ABC</p>
        </div>
      </div>

      {/* Volume */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Volume</p>
          <span className="text-xs text-slate-400">{muted ? 'Muted' : `${volume}%`}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustVolume(-10)}
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-sm transition-colors"
          >
            🔉
          </button>
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all"
              style={{ width: muted ? '0%' : `${volume}%` }}
            />
          </div>
          <button
            onClick={() => adjustVolume(10)}
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-sm transition-colors"
          >
            🔊
          </button>
          <button
            onClick={() => setMuted((m) => !m)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${muted ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            🔇
          </button>
        </div>
      </div>

      {/* Quick launch */}
      <div className="space-y-1.5">
        <p className="text-xs text-slate-500">Quick Launch</p>
        <div className="flex gap-2 flex-wrap">
          {['Netflix', 'YouTube', 'Disney+'].map((app) => (
            <button
              key={app}
              onClick={() => setActiveApp(app)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeApp === app
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {app}
            </button>
          ))}
        </div>
      </div>

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
