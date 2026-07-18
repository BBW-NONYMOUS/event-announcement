import { Skeleton } from './ui/Feedback'

export function StatCard({ label, value, hint, icon: Icon, loading = false, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}>
            <Icon aria-hidden="true" className="size-4" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      )}
      {hint && !loading && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
