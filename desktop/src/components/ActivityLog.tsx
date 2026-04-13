export default function ActivityLog() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">Activity Log</h3>
        <span className="text-xs text-slate-500">0 events</span>
      </div>
      <div className="px-5 py-8 text-center text-slate-500 text-sm">
        No activity yet. Connect a Roku device to see events here.
      </div>
    </div>
  )
}
