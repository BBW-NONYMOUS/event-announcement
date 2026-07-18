import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarDays, CheckCircle2, Users } from 'lucide-react'
import { apiErrorMessage } from '../api/client'
import { useEvents } from '../hooks/useEvents'
import { useAllEventStats } from '../hooks/useStats'
import { PageHeader } from '../components/layout/PageShell'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState, ErrorState, LoadingBlock, Skeleton } from '../components/ui/Feedback'
import { StatCard } from '../components/StatCard'
import { AttendeeTable } from '../components/AttendeeTable'

/** Long titles would squash the axis; the tooltip still shows the full one. */
const truncate = (text, max = 16) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

function AttendanceChart({ perEvent, isPending }) {
  const data = useMemo(
    () =>
      perEvent
        .filter((entry) => entry.stats)
        .map((entry) => ({
          name: truncate(entry.event.title),
          fullName: entry.event.title,
          Registered: entry.stats.registered,
          'Checked in': entry.stats.checked_in,
        })),
    [perEvent],
  )

  if (isPending) {
    return <Skeleton className="h-72 w-full" />
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing to chart yet"
        description="Once events have registrations, attendance shows up here."
      />
    )
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 12,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Registered" fill="#a5b4fc" radius={[4, 4, 0, 0]} maxBarSize={48} />
          <Bar dataKey="Checked in" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Dashboard() {
  const { data: events, isPending, isError, error, refetch } = useEvents()
  const { perEvent, totals, isPending: statsPending } = useAllEventStats(events ?? [])
  // Null means "not chosen yet" — fall back to the first event rather than
  // syncing a default into state from an effect.
  const [selectedId, setSelectedId] = useState(null)
  const selected = events?.find((event) => event.id === selectedId) ?? events?.[0] ?? null
  const openCount = events?.filter((event) => event.status === 'open').length ?? 0

  if (isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Card>
          <ErrorState
            message={apiErrorMessage(error, 'Could not load the dashboard')}
            onRetry={refetch}
          />
        </Card>
      </>
    )
  }

  if (isPending) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <LoadingBlock label="Loading dashboard…" rows={3} />
      </>
    )
  }

  if (!events.length) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            description="Create your first event to start tracking registrations and check-ins."
            action={
              <Link
                to="/events"
                className="inline-flex items-center rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                Go to Events
              </Link>
            }
          />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Registrations and check-ins across all events." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Events"
          value={events.length}
          hint={`${openCount} open`}
          icon={CalendarDays}
        />
        {/* Totals stay blank until every per-event request lands — a partial
            sum would look authoritative and be wrong. */}
        <StatCard
          label="Registered"
          value={totals?.registered ?? '—'}
          hint={totals ? `across ${events.length} events` : undefined}
          icon={Users}
          loading={statsPending}
        />
        <StatCard
          label="Checked in"
          value={totals?.checkedIn ?? '—'}
          hint={
            totals && totals.registered > 0
              ? `${Math.round((totals.checkedIn / totals.registered) * 100)}% turnout`
              : undefined
          }
          icon={CheckCircle2}
          tone="emerald"
          loading={statsPending}
        />
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Registered vs checked in</h2>
        <p className="mt-0.5 mb-4 text-xs text-slate-500">Per event, straight from the stats endpoint.</p>
        <AttendanceChart perEvent={perEvent} isPending={statsPending} />
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Attendees"
          description="Who registered, and who has arrived."
          action={
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <span className="sr-only sm:not-sr-only">Event</span>
              <select
                value={selected?.id ?? ''}
                onChange={(changed) => setSelectedId(Number(changed.target.value))}
                className="rounded-lg border-0 bg-white py-1.5 pr-8 pl-3 text-sm text-slate-900 ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-primary-500"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
          }
        />
        <AttendeeTable event={selected} />
      </Card>
    </>
  )
}
