import { AlertTriangle, Inbox } from 'lucide-react'
import { Button } from './Button'

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />
}

export function SkeletonRows({ rows = 4, className = 'h-14' }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={className} />
      ))}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading…', rows = 4 }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <SkeletonRows rows={rows} />
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="rounded-full bg-slate-100 p-3">
        <Icon aria-hidden="true" className="size-6 text-slate-400" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Could not load this', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="rounded-full bg-red-50 p-3">
        <AlertTriangle aria-hidden="true" className="size-6 text-red-500" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
