interface RokuDeviceCardProps {
  onRefresh: () => void
  onScan: () => void
}

export default function RokuDeviceCard({ onRefresh, onScan }: RokuDeviceCardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-xl">
            📺
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">No Device Connected</h3>
            <p className="text-xs text-slate-400">Scan your network to find Roku devices</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/50 border border-slate-600/50 text-xs text-slate-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Not Connected
        </span>
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
