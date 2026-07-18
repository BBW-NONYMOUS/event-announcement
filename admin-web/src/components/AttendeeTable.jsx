import { useMemo, useState } from 'react'
import { Download, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { apiErrorMessage } from '../api/client'
import { useAttendees } from '../hooks/useStats'
import { downloadCsv, slugify, toCsv } from '../lib/csv'
import { formatDateTime } from '../lib/format'
import { Button } from './ui/Button'
import { EmptyState, ErrorState, LoadingBlock } from './ui/Feedback'
import { TicketStatusPill } from './ui/StatusPill'

const CSV_COLUMNS = [
  { header: 'Name', value: (row) => row.name },
  { header: 'Email', value: (row) => row.email },
  { header: 'Ticket code', value: (row) => row.ticket_code },
  { header: 'Status', value: (row) => row.status },
  { header: 'Checked in at', value: (row) => row.checked_in_at ?? '' },
]

export function AttendeeTable({ event }) {
  const { data: attendees, isPending, isError, error, refetch } = useAttendees(event?.id)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!attendees) return []
    const term = search.trim().toLowerCase()
    if (!term) return attendees
    return attendees.filter(
      (attendee) =>
        attendee.name.toLowerCase().includes(term) ||
        attendee.email.toLowerCase().includes(term) ||
        attendee.ticket_code.toLowerCase().includes(term),
    )
  }, [attendees, search])

  const exportCsv = () => {
    if (!filtered.length) return
    downloadCsv(`${slugify(event.title, 'event')}-attendees.csv`, toCsv(CSV_COLUMNS, filtered))
    toast.success(`Exported ${filtered.length} attendee${filtered.length === 1 ? '' : 's'}`)
  }

  if (!event) {
    return (
      <EmptyState
        icon={Users}
        title="No event selected"
        description="Pick an event to see who is coming."
      />
    )
  }

  if (isPending) {
    return (
      <div className="p-5">
        <LoadingBlock label="Loading attendees…" rows={5} />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState message={apiErrorMessage(error, 'Could not load attendees')} onRetry={refetch} />
    )
  }

  if (!attendees.length) {
    return (
      <EmptyState
        icon={Users}
        title="No one has registered yet"
        description={`When people register for "${event.title}" through the mobile app, they'll appear here.`}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(changed) => setSearch(changed.target.value)}
            aria-label="Search attendees"
            placeholder="Search by name, email, or ticket code"
            className="block w-full rounded-lg border-0 bg-white py-2 pr-3 pl-9 text-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:ring-inset"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!filtered.length}>
          <Download aria-hidden="true" className="size-3.5" />
          Export CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No attendees match your search"
          description="Try a different name, email, or ticket code."
          action={
            <Button variant="secondary" onClick={() => setSearch('')}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                <th scope="col" className="px-5 py-3">
                  Attendee
                </th>
                <th scope="col" className="px-5 py-3">
                  Ticket
                </th>
                <th scope="col" className="px-5 py-3">
                  Status
                </th>
                <th scope="col" className="px-5 py-3">
                  Checked in
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((attendee) => (
                <tr key={attendee.ticket_code} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{attendee.name}</p>
                    <p className="text-xs text-slate-500">{attendee.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {attendee.ticket_code.slice(0, 8)}…
                    </code>
                  </td>
                  <td className="px-5 py-3">
                    <TicketStatusPill status={attendee.status} />
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {attendee.checked_in_at ? formatDateTime(attendee.checked_in_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-slate-200 px-5 py-2.5 text-xs text-slate-400">
        Showing {filtered.length} of {attendees.length} attendees.
      </p>
    </div>
  )
}
