interface LogEntry {
  id: number
  time: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

const ICON: Record<LogEntry['type'], string> = {
  info: '💬',
  success: '✅',
  warning: '⚠️',
  error: '❌',
}

const COLOR: Record<LogEntry['type'], string> = {
  info: 'text-slate-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
}

const SAMPLE_LOG: LogEntry[] = [
  { id: 1, time: '02:24:01', type: 'success', message: 'Living Room TV connected — 192.168.1.101' },
  { id: 2, time: '02:23:47', type: 'info',    message: 'Network scan started' },
  { id: 3, time: '02:22:33', type: 'success', message: 'Netflix launched on Living Room TV' },
  { id: 4, time: '02:20:05', type: 'warning', message: 'Bedroom TV signal degraded (Weak)' },
  { id: 5, time: '02:18:59', type: 'info',    message: 'Office Monitor went offline' },
  { id: 6, time: '02:15:12', type: 'success', message: 'Max updated to v52.50.0' },
  { id: 7, time: '02:11:40', type: 'info',    message: 'Portal started — device discovery enabled' },
]

interface ActivityLogProps {
  extraEntries?: LogEntry[]
}

export default function ActivityLog({ extraEntries = [] }: ActivityLogProps) {
  const entries = [...extraEntries, ...SAMPLE_LOG].slice(0, 10)

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">Activity Log</h3>
        <span className="text-xs text-slate-500">{entries.length} events</span>
      </div>
      <ul className="divide-y divide-slate-700/60">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-700/30 transition-colors">
            <span className="mt-0.5 text-sm">{ICON[entry.type]}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${COLOR[entry.type]}`}>{entry.message}</p>
            </div>
            <span className="shrink-0 text-xs font-mono text-slate-600">{entry.time}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
