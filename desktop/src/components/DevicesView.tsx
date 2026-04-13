import { useState } from 'react'

interface Device {
  id: string
  name: string
  model: string
  ip: string
  osVersion: string
  signal: 'Strong' | 'Good' | 'Weak'
  status: 'online' | 'offline' | 'idle'
  lastSeen: string
  serialNumber: string
  location: string
}

const SAMPLE_DEVICES: Device[] = [
  {
    id: 'dev-001',
    name: 'Living Room TV',
    model: 'Roku Ultra (4802R)',
    ip: '192.168.1.101',
    osVersion: '12.5.0',
    signal: 'Strong',
    status: 'online',
    lastSeen: 'Now',
    serialNumber: 'X12345ABC',
    location: 'Living Room',
  },
  {
    id: 'dev-002',
    name: 'Bedroom TV',
    model: 'Roku Express 4K+ (3941)',
    ip: '192.168.1.102',
    osVersion: '12.4.1',
    signal: 'Good',
    status: 'idle',
    lastSeen: '14 min ago',
    serialNumber: 'Y67890DEF',
    location: 'Bedroom',
  },
  {
    id: 'dev-003',
    name: 'Office Monitor',
    model: 'Roku Streaming Stick 4K (3820)',
    ip: '192.168.1.108',
    osVersion: '12.3.0',
    signal: 'Weak',
    status: 'offline',
    lastSeen: '2 hours ago',
    serialNumber: 'Z11223GHI',
    location: 'Office',
  },
]

const STATUS_STYLES: Record<Device['status'], { dot: string; badge: string; text: string }> = {
  online: {
    dot: 'bg-emerald-400 animate-pulse',
    badge: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
  },
  idle: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-400',
  },
  offline: {
    dot: 'bg-slate-500',
    badge: 'bg-slate-700/50 border-slate-600/50',
    text: 'text-slate-400',
  },
}

const SIGNAL_ICON: Record<Device['signal'], string> = {
  Strong: '📶',
  Good: '📶',
  Weak: '📵',
}

interface DevicesViewProps {
  onStatusMessage: (msg: string) => void
}

export default function DevicesView({ onStatusMessage }: DevicesViewProps) {
  const [devices, setDevices] = useState<Device[]>(SAMPLE_DEVICES)
  const [selectedId, setSelectedId] = useState<string | null>('dev-001')
  const [scanning, setScanning] = useState(false)
  const [search, setSearch] = useState('')

  const selectedDevice = devices.find((d) => d.id === selectedId) ?? null

  function handleScan() {
    setScanning(true)
    onStatusMessage('Scanning local network for Roku devices…')
    setTimeout(() => {
      setScanning(false)
      onStatusMessage('Network scan complete — 3 devices found.')
    }, 2500)
  }

  function handlePower(device: Device) {
    const next = device.status === 'online' ? 'idle' : 'online'
    setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, status: next } : d)))
    onStatusMessage(`${device.name}: ${next === 'idle' ? 'powered off' : 'powered on'}`)
  }

  function handleReboot(device: Device) {
    onStatusMessage(`Rebooting ${device.name}…`)
  }

  const filtered = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.model.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Devices</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {devices.filter((d) => d.status === 'online').length} online · {devices.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-60 transition-colors"
          >
            {scanning ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Scanning…
              </>
            ) : (
              <>🔍 Scan Network</>
            )}
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search devices by name, model or location…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Device list */}
        <div className="col-span-1 space-y-2">
          {filtered.length === 0 && (
            <p className="text-slate-500 text-sm px-2">No devices match your search.</p>
          )}
          {filtered.map((device) => {
            const s = STATUS_STYLES[device.status]
            const isSelected = selectedId === device.id
            return (
              <button
                key={device.id}
                onClick={() => setSelectedId(device.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500/40'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white text-sm">{device.name}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${s.badge} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {device.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{device.location} · {device.ip}</p>
              </button>
            )
          })}
        </div>

        {/* Device detail */}
        <div className="col-span-2">
          {selectedDevice ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-5">
              {/* Device header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-2xl">
                    📺
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{selectedDevice.name}</h3>
                    <p className="text-sm text-slate-400">{selectedDevice.model}</p>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${STATUS_STYLES[selectedDevice.status].badge} ${STATUS_STYLES[selectedDevice.status].text}`}>
                  <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[selectedDevice.status].dot}`} />
                  {selectedDevice.status.charAt(0).toUpperCase() + selectedDevice.status.slice(1)}
                </div>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { label: 'IP Address', value: selectedDevice.ip, mono: true },
                  { label: 'Location', value: selectedDevice.location, mono: false },
                  { label: 'OS Version', value: selectedDevice.osVersion, mono: false },
                  { label: 'Serial Number', value: selectedDevice.serialNumber, mono: true },
                  { label: 'Signal', value: `${SIGNAL_ICON[selectedDevice.signal]} ${selectedDevice.signal}`, mono: false },
                  { label: 'Last Seen', value: selectedDevice.lastSeen, mono: false },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="bg-slate-900 rounded-lg p-3">
                    <p className="text-slate-500 text-xs mb-1">{label}</p>
                    <p className={`text-slate-200 text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Controls</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handlePower(selectedDevice)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedDevice.status === 'online'
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {selectedDevice.status === 'online' ? '⏻ Power Off' : '⏻ Power On'}
                  </button>
                  <button
                    onClick={() => handleReboot(selectedDevice)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  >
                    🔄 Reboot
                  </button>
                  <button
                    onClick={() => onStatusMessage(`Launching remote for ${selectedDevice.name}…`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  >
                    🎮 Remote
                  </button>
                  <button
                    onClick={() => onStatusMessage(`Opening screenshot for ${selectedDevice.name}…`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  >
                    📷 Screenshot
                  </button>
                </div>
              </div>

              {/* Volume row */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Volume</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onStatusMessage('Volume down')}
                    className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-lg transition-colors"
                  >
                    🔉
                  </button>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-3/5 bg-sky-500 rounded-full" />
                  </div>
                  <button
                    onClick={() => onStatusMessage('Volume up')}
                    className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-lg transition-colors"
                  >
                    🔊
                  </button>
                  <button
                    onClick={() => onStatusMessage('Muted')}
                    className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-lg transition-colors"
                  >
                    🔇
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <span className="text-4xl">📺</span>
              <p className="font-medium">Select a device to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
