interface TopNavProps {
  onSettingsClick: () => void
}

export default function TopNav({ onSettingsClick }: TopNavProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700 shadow-md">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📡</span>
        <span className="text-lg font-bold text-sky-400 tracking-wide">NUMO Roku Portal</span>
        <span className="text-xs text-slate-500 font-medium">v2</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          No Device
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Notifications"
        >
          🔔
        </button>
        <button
          className="px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          onClick={onSettingsClick}
          title="Settings"
        >
          ⚙️ Settings
        </button>
      </div>
    </header>
  )
}
