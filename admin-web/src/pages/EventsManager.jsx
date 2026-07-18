import { useMemo, useState } from 'react'
import { CalendarDays, ImageOff, MapPin, Pencil, Plus, Search, Star, Users } from 'lucide-react'
import { apiErrorMessage } from '../api/client'
import { useCreateEvent, useEvents, useUpdateEvent } from '../hooks/useEvents'
import { useSettings } from '../hooks/useSettings'
import { formatEventDate, formatTimeRange } from '../lib/format'
import { resolveImageUrl } from '../lib/images'
import { PageHeader } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/Feedback'
import { Modal } from '../components/ui/Modal'
import { EventStatusPill } from '../components/ui/StatusPill'
import { EventForm } from '../components/EventForm'

const STATUS_FILTERS = ['all', 'open', 'closed', 'cancelled']

function CapacityBar({ registered, capacity }) {
  const percent = capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0
  const full = capacity > 0 && registered >= capacity

  return (
    <div className="w-40">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">
          {registered}
          <span className="text-slate-400"> / {capacity}</span>
        </span>
        <span className={full ? 'font-medium text-amber-600' : 'text-slate-400'}>
          {full ? 'Full' : `${percent}%`}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${full ? 'bg-amber-500' : 'bg-primary-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/** The banner attendees see, at a glance. Decorative — the title is right
 *  next to it — so it carries an empty alt rather than repeating the name. */
function EventThumbnail({ event }) {
  const [broken, setBroken] = useState(false)
  const source = resolveImageUrl(event.image_url)

  if (!source || broken) {
    return (
      <div
        title={broken ? 'This image could not be loaded' : 'No image'}
        className="grid size-14 shrink-0 place-items-center rounded-lg bg-slate-100"
      >
        <ImageOff aria-hidden="true" className="size-4 text-slate-400" />
      </div>
    )
  }

  return (
    <img
      src={source}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className="size-14 shrink-0 rounded-lg bg-slate-100 object-cover"
    />
  )
}

function EventRow({ event, onEdit, onClose, onCancel, onToggleFeatured, featuring }) {
  // Featuring is a promotion slot on a screen that only lists open events, so
  // the control is meaningless once an event is closed or cancelled.
  const canFeature = event.status === 'open'

  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-slate-50/70">
      <EventThumbnail event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-900">{event.title}</h3>
          <EventStatusPill status={event.status} />
          {event.is_featured && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
              <Star aria-hidden="true" className="size-3" />
              Featured
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            {formatEventDate(event.event_date)} · {formatTimeRange(event.start_time, event.end_time)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden="true" className="size-3.5" />
            {event.venue}
            {event.latitude !== null && event.longitude !== null && (
              <span className="text-slate-400"> (mapped)</span>
            )}
          </span>
        </div>
      </div>

      <CapacityBar registered={event.registered_count} capacity={event.capacity} />

      <div className="flex items-center gap-1.5">
        {canFeature && (
          <Button
            variant="ghost"
            size="sm"
            disabled={featuring}
            aria-pressed={event.is_featured}
            title={event.is_featured ? 'Remove from featured' : 'Feature on the mobile home screen'}
            onClick={() => onToggleFeatured(event)}
          >
            <Star
              aria-hidden="true"
              className={`size-3.5 ${event.is_featured ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`}
            />
            {event.is_featured ? 'Unfeature' : 'Feature'}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => onEdit(event)}>
          <Pencil aria-hidden="true" className="size-3.5" />
          Edit
        </Button>
        {event.status === 'open' && (
          <Button variant="ghost" size="sm" onClick={() => onClose(event)}>
            Close
          </Button>
        )}
        {event.status !== 'cancelled' && (
          <Button variant="ghost" size="sm" onClick={() => onCancel(event)}>
            Cancel
          </Button>
        )}
      </div>
    </li>
  )
}

export function EventsManager() {
  const { data: events, isPending, isError, error, refetch } = useEvents()
  // Only for the new-event form's prefill. A failure here is not worth blocking
  // the page for — EventForm falls back to its own defaults.
  const { data: settings } = useSettings()
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()

  const [editing, setEditing] = useState(null) // null | 'new' | event
  const [confirming, setConfirming] = useState(null) // { event, status }
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  // Which row's star is in flight — updateEvent.isPending alone would disable
  // every row's button while one is saving.
  const [featuringId, setFeaturingId] = useState(null)

  const filtered = useMemo(() => {
    if (!events) return []
    const term = search.trim().toLowerCase()
    return events.filter((event) => {
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter
      const matchesTerm =
        !term ||
        event.title.toLowerCase().includes(term) ||
        event.venue.toLowerCase().includes(term)
      return matchesStatus && matchesTerm
    })
  }, [events, search, statusFilter])

  const submitForm = async (values) => {
    const mutation = editing === 'new' ? createEvent : updateEvent
    const payload = editing === 'new' ? values : { id: editing.id, ...values }
    try {
      await mutation.mutateAsync(payload)
      setEditing(null)
    } catch {
      // The hook already toasted the server's message; keep the form open.
    }
  }

  const toggleFeatured = async (event) => {
    setFeaturingId(event.id)
    try {
      await updateEvent.mutateAsync({ id: event.id, is_featured: !event.is_featured })
    } catch {
      // The hook already toasted the server's message.
    } finally {
      setFeaturingId(null)
    }
  }

  const confirmStatusChange = async () => {
    try {
      await updateEvent.mutateAsync({ id: confirming.event.id, status: confirming.status })
      setConfirming(null)
    } catch {
      setConfirming(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Events"
        description="Create events, adjust capacity, and close or cancel them."
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden="true" className="size-4" />
            New event
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search events"
              placeholder="Search by title or venue"
              className="block w-full rounded-lg border-0 bg-white py-2 pr-3 pl-9 text-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:ring-inset"
            />
          </div>

          <div className="flex gap-1" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {isPending && (
          <div className="p-5">
            <LoadingBlock label="Loading events…" />
          </div>
        )}

        {isError && (
          <ErrorState message={apiErrorMessage(error, 'Could not load events')} onRetry={refetch} />
        )}

        {!isPending && !isError && filtered.length === 0 && (
          <EmptyState
            icon={events?.length ? Search : CalendarDays}
            title={events?.length ? 'No events match your filters' : 'No events yet'}
            description={
              events?.length
                ? 'Try a different search term or status filter.'
                : 'Create your first event and it will show up here.'
            }
            action={
              events?.length ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setEditing('new')}>
                  <Plus aria-hidden="true" className="size-4" />
                  New event
                </Button>
              )
            }
          />
        )}

        {!isPending && !isError && filtered.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {filtered.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onEdit={setEditing}
                onToggleFeatured={toggleFeatured}
                featuring={featuringId === event.id}
                onClose={(target) => setConfirming({ event: target, status: 'closed' })}
                onCancel={(target) => setConfirming({ event: target, status: 'cancelled' })}
              />
            ))}
          </ul>
        )}
      </Card>

      {!isPending && !isError && events?.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Users aria-hidden="true" className="size-3.5" />
          Showing {filtered.length} of {events.length} events.
        </p>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New event' : 'Edit event'}
        description={
          editing === 'new'
            ? 'Attendees see this in the mobile app as soon as it is open.'
            : editing?.title
        }
      >
        {editing !== null && (
          <EventForm
            // Remount on target change so defaults reload.
            key={editing === 'new' ? 'new' : editing.id}
            event={editing === 'new' ? null : editing}
            appDefaults={
              settings && {
                category: settings.default_category,
                status: settings.default_event_status,
              }
            }
            onSubmit={submitForm}
            onCancel={() => setEditing(null)}
            pending={createEvent.isPending || updateEvent.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={confirmStatusChange}
        loading={updateEvent.isPending}
        title={confirming?.status === 'closed' ? 'Close this event?' : 'Cancel this event?'}
        confirmLabel={confirming?.status === 'closed' ? 'Close event' : 'Cancel event'}
        message={
          confirming?.status === 'closed'
            ? `"${confirming?.event.title}" will stop accepting new registrations. Existing tickets stay valid and can still be checked in.`
            : `"${confirming?.event.title}" will be cancelled. Check-in will be refused for every ticket on this event.`
        }
      />
    </>
  )
}
