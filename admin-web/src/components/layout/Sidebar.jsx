import { NavLink } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, Megaphone, QrCode, Settings, Ticket } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/checkin', label: 'Check-in', icon: QrCode },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-lg bg-primary-600">
          <Ticket aria-hidden="true" className="size-5 text-white" />
        </span>
        <span className="text-sm font-semibold text-slate-900">Event Admin</span>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  aria-hidden="true"
                  className={`size-4.5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <p className="px-5 py-4 text-xs text-slate-400">Admin console</p>
    </div>
  )
}
