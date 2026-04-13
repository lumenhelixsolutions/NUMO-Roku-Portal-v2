interface RokuDeviceCardProps {
  onRefresh: () => void
  onScan: () => void
}

export default function RokuDeviceCard({ onRefresh, onScan }: RokuDeviceCardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-xl">
            📺
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Roku Device</h3>
            <p className="text-xs text-slate-400">Primary Display</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Online
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">IP Address</p>
          <p className="text-slate-200 font-mono">192.168.1.xxx</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Model</p>
          <p className="text-slate-200">Roku Ultra</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">OS Version</p>
          <p className="text-slate-200">12.5.0</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Signal</p>
          <p className="text-slate-200">📶 Strong</p>
        </div>
      </div>

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
