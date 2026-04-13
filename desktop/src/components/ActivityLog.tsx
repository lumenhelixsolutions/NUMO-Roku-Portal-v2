export interface ActivityEntry {
  id: number
  timestamp: Date
  message: string
}

interface ActivityLogProps {
  entries: ActivityEntry[]
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ActivityLog({ entries }: ActivityLogProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">Activity Log</h3>
        <span className="text-xs text-slate-500">{entries.length} event{entries.length !== 1 ? 's' : ''}</span>
      </div>

      {entries.length === 0 ? (
        <div className="px-5 py-8 text-center text-slate-500 text-sm">
          No activity yet. Connect a Roku device to see events here.
        </div>
      ) : (
        <ul className="divide-y divide-slate-700/50 max-h-48 overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="text-xs text-slate-500 tabular-nums shrink-0">
                {formatTime(entry.timestamp)}
              </span>
              <span className="text-sm text-slate-300 truncate">{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
