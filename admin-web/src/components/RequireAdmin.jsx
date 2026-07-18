import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

/** Gate for every route except /login. The server enforces this too; this only
 *  keeps a non-admin from seeing an admin-shaped shell full of failed calls. */
export function RequireAdmin({ children }) {
  const { token, user, isLoading, isError } = useAuth()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // A restored token still has to be checked against /me before we trust it.
  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div role="status" className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Restoring your session…
        </div>
      </div>
    )
  }

  // /me failed, or the account lost its admin role since the token was issued.
  if (isError || !user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return children
}
