import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'
  )
}

export function Topbar({ onOpenSidebar }) {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
        className="-ml-1 rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700"
          >
            {initials(user?.name)}
          </span>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name ?? '—'}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  )
}
