interface DevicesViewProps {
  onStatusMessage: (msg: string) => void
}

export default function DevicesView({ onStatusMessage }: DevicesViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Devices</h2>
        <p className="text-sm text-slate-400 mt-0.5">Roku devices on your local network.</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
        <span className="text-4xl">📺</span>
        <div>
          <p className="font-medium text-white">No devices found</p>
          <p className="text-sm mt-1">Scan your network to discover Roku devices.</p>
        </div>
        <button
          onClick={() => onStatusMessage('Scanning local network for Roku devices…')}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          🔍 Scan Network
        </button>
      </div>
    </div>
  )
}


