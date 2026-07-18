import { AlertTriangle, Check, ScanLine, X } from 'lucide-react'
import { formatDateTime, formatEventDate } from '../lib/format'

/**
 * The big verdict panel. Deliberately oversized: it has to be readable across
 * a check-in desk at a glance, so colour, icon, and headline all carry the
 * same signal rather than relying on the text alone.
 */
export function CheckinResult({ result }) {
  if (!result) {
    return (
      <div className="grid min-h-72 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <div>
          <ScanLine aria-hidden="true" className="mx-auto size-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">Waiting for a ticket</p>
          <p className="mt-1 text-xs text-slate-400">
            Scan a QR code or type the ticket code and press Enter.
          </p>
        </div>
      </div>
    )
  }

  if (result.kind === 'success') {
    const { user, event, ticket } = result.data
    return (
      <Panel tone="success" icon={Check} headline="Checked in">
        <p className="text-2xl font-bold text-emerald-950">{user.name}</p>
        <p className="mt-1 text-sm text-emerald-800">{user.email}</p>
        <dl className="mt-5 space-y-1.5 border-t border-emerald-200 pt-4 text-sm">
          <Row label="Event" value={event.title} />
          <Row label="Date" value={formatEventDate(event.event_date)} />
          <Row label="Seat" value={ticket.seat} />
        </dl>
      </Panel>
    )
  }

  if (result.status === 409) {
    return (
      <Panel tone="warning" icon={AlertTriangle} headline="Already checked in">
        <p className="text-lg font-semibold text-amber-950">
          {result.checkedInAt
            ? `This ticket was already used on ${formatDateTime(result.checkedInAt)}.`
            : result.message}
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Do not admit again without checking with a supervisor.
        </p>
      </Panel>
    )
  }

  return (
    <Panel
      tone="error"
      icon={X}
      headline={result.status === 404 ? 'Ticket not found' : 'Cannot check in'}
    >
      <p className="text-lg font-semibold text-red-950">{result.message}</p>
      {result.status === 404 && (
        <p className="mt-2 text-sm text-red-800">
          Double-check the code, or look the attendee up in the event&apos;s attendee list.
        </p>
      )}
    </Panel>
  )
}

const TONES = {
  success: {
    panel: 'border-emerald-300 bg-emerald-50',
    badge: 'bg-emerald-600',
    headline: 'text-emerald-700',
  },
  warning: {
    panel: 'border-amber-300 bg-amber-50',
    badge: 'bg-amber-500',
    headline: 'text-amber-700',
  },
  error: {
    panel: 'border-red-300 bg-red-50',
    badge: 'bg-red-600',
    headline: 'text-red-700',
  },
}

function Panel({ tone, icon: Icon, headline, children }) {
  const styles = TONES[tone]

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`min-h-72 rounded-xl border-2 p-6 text-center ${styles.panel}`}
    >
      <span className={`mx-auto grid size-16 place-items-center rounded-full ${styles.badge}`}>
        <Icon aria-hidden="true" className="size-10 text-white" strokeWidth={3} />
      </span>
      <p
        className={`mt-3 text-xs font-bold tracking-widest uppercase ${styles.headline}`}
      >
        {headline}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-emerald-800">{label}</dt>
      <dd className="font-medium text-emerald-950">{value}</dd>
    </div>
  )
}
