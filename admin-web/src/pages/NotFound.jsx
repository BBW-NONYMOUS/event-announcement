import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-sm font-semibold text-primary-600">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          That page doesn&apos;t exist in the admin console.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
