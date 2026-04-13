import { useState } from 'react'

type AppStatus = 'installed' | 'available' | 'update'

interface RokuApp {
  id: string
  name: string
  category: string
  icon: string
  status: AppStatus
  version: string
  size: string
  description: string
}

const APPS: RokuApp[] = [
  {
    id: 'app-netflix',
    name: 'Netflix',
    category: 'Streaming',
    icon: '🎬',
    status: 'installed',
    version: '4.1.218',
    size: '9.2 MB',
    description: 'Stream TV shows, movies, anime and more.',
  },
  {
    id: 'app-youtube',
    name: 'YouTube',
    category: 'Video',
    icon: '▶️',
    status: 'installed',
    version: '2.9.1',
    size: '5.4 MB',
    description: 'Watch videos, music and live streams.',
  },
  {
    id: 'app-disneyplus',
    name: 'Disney+',
    category: 'Streaming',
    icon: '✨',
    status: 'installed',
    version: '3.0.4',
    size: '7.8 MB',
    description: 'Disney, Pixar, Marvel, Star Wars and National Geographic.',
  },
  {
    id: 'app-hbomax',
    name: 'Max',
    category: 'Streaming',
    icon: '🎭',
    status: 'update',
    version: '52.50.0',
    size: '11.2 MB',
    description: 'Movies, TV and Max Originals from Warner Bros.',
  },
  {
    id: 'app-hulu',
    name: 'Hulu',
    category: 'Streaming',
    icon: '🟩',
    status: 'available',
    version: '5.3.0',
    size: '8.1 MB',
    description: 'Watch live TV, sports and the latest shows.',
  },
  {
    id: 'app-peacock',
    name: 'Peacock',
    category: 'Streaming',
    icon: '🦚',
    status: 'available',
    version: '7.0.2',
    size: '6.3 MB',
    description: 'NBC, Universal and live sports streaming.',
  },
  {
    id: 'app-pluto',
    name: 'Pluto TV',
    category: 'Free TV',
    icon: '🪐',
    status: 'available',
    version: '5.2.1',
    size: '4.7 MB',
    description: 'Free live TV and on-demand movies.',
  },
  {
    id: 'app-sling',
    name: 'Sling TV',
    category: 'Live TV',
    icon: '📡',
    status: 'available',
    version: '9.1.0',
    size: '12.5 MB',
    description: 'Live sports, news, and top cable channels.',
  },
]

const STATUS_LABEL: Record<AppStatus, { label: string; color: string }> = {
  installed: { label: 'Installed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  available: { label: 'Available', color: 'text-slate-400 bg-slate-700/50 border-slate-600/50' },
  update: { label: 'Update Available', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
}

type FilterTab = 'all' | 'installed' | 'available' | 'update'

interface AppsViewProps {
  onStatusMessage: (msg: string) => void
}

export default function AppsView({ onStatusMessage }: AppsViewProps) {
  const [apps, setApps] = useState<RokuApp[]>(APPS)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [launching, setLaunching] = useState<string | null>(null)

  function handleLaunch(app: RokuApp) {
    setLaunching(app.id)
    onStatusMessage(`Launching ${app.name}…`)
    setTimeout(() => setLaunching(null), 1800)
  }

  function handleInstall(app: RokuApp) {
    setApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: 'installed' } : a)),
    )
    onStatusMessage(`${app.name} installed successfully.`)
  }

  function handleUpdate(app: RokuApp) {
    setApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: 'installed' } : a)),
    )
    onStatusMessage(`${app.name} updated to latest version.`)
  }

  function handleUninstall(app: RokuApp) {
    setApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: 'available' } : a)),
    )
    onStatusMessage(`${app.name} uninstalled.`)
  }

  const displayed = apps.filter((app) => {
    const matchFilter = filter === 'all' || app.status === filter
    const matchSearch =
      search.trim() === '' ||
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.category.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: apps.length },
    { id: 'installed', label: 'Installed', count: apps.filter((a) => a.status === 'installed').length },
    { id: 'update', label: 'Updates', count: apps.filter((a) => a.status === 'update').length },
    { id: 'available', label: 'Available', count: apps.filter((a) => a.status === 'available').length },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Apps &amp; Channels</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {apps.filter((a) => a.status === 'installed' || a.status === 'update').length} installed ·{' '}
            {apps.filter((a) => a.status === 'update').length} updates available
          </p>
        </div>
        <button
          onClick={() => onStatusMessage('Opening Roku Channel Store…')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
        >
          🛒 Channel Store
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-700 rounded-full text-slate-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search apps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        />
      </div>

      {/* App grid */}
      {displayed.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center text-slate-400 space-y-2">
          <span className="text-4xl">🎬</span>
          <p className="font-medium">No apps match your filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {displayed.map((app) => {
            const s = STATUS_LABEL[app.status]
            const isLaunching = launching === app.id
            return (
              <div
                key={app.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-600 transition-colors"
              >
                {/* App header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-xl">
                      {app.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{app.name}</p>
                      <p className="text-xs text-slate-500">{app.category}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${s.color}`}>
                    {s.label}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{app.description}</p>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>v{app.version}</span>
                  <span>{app.size}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {(app.status === 'installed' || app.status === 'update') && (
                    <>
                      <button
                        onClick={() => handleLaunch(app)}
                        disabled={isLaunching}
                        className="flex-1 py-1.5 px-3 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
                      >
                        {isLaunching ? '▶ Launching…' : '▶ Launch'}
                      </button>
                      {app.status === 'update' && (
                        <button
                          onClick={() => handleUpdate(app)}
                          className="flex-1 py-1.5 px-3 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
                        >
                          ⬆ Update
                        </button>
                      )}
                      <button
                        onClick={() => handleUninstall(app)}
                        className="py-1.5 px-3 text-xs bg-slate-700 hover:bg-red-700 text-slate-300 hover:text-white rounded-lg font-medium transition-colors"
                        title="Uninstall"
                      >
                        🗑
                      </button>
                    </>
                  )}
                  {app.status === 'available' && (
                    <button
                      onClick={() => handleInstall(app)}
                      className="flex-1 py-1.5 px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                    >
                      ⬇ Install
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
