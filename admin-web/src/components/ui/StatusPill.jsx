const EVENT_STYLES = {
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  closed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
}

const TICKET_STYLES = {
  registered: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  checked_in: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
}

const TICKET_LABELS = {
  registered: 'Registered',
  checked_in: 'Checked in',
  cancelled: 'Cancelled',
}

const EVENT_LABELS = {
  open: 'Open',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

const BASE =
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

export function EventStatusPill({ status }) {
  return (
    <span className={`${BASE} ${EVENT_STYLES[status] ?? EVENT_STYLES.closed}`}>
      {EVENT_LABELS[status] ?? status}
    </span>
  )
}

export function TicketStatusPill({ status }) {
  return (
    <span className={`${BASE} ${TICKET_STYLES[status] ?? TICKET_STYLES.cancelled}`}>
      {TICKET_LABELS[status] ?? status}
    </span>
  )
}
