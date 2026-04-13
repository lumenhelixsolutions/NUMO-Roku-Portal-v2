type NavSection = 'dashboard' | 'devices' | 'apps' | 'settings'

interface SidebarProps {
  activeSection: NavSection
  onNavigate: (section: NavSection) => void
}

const navItems: { id: NavSection; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'devices', label: 'Devices', icon: '📺' },
  { id: 'apps', label: 'Apps', icon: '🎬' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col py-4">
      <nav className="flex-1 px-3 space-y-1">
        <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-600">NUMO Roku Portal v2</p>
        <p className="text-xs text-slate-700">Lumen Helix Solutions</p>
      </div>
    </aside>
  )
}
