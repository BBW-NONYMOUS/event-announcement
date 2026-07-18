import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Globe, Megaphone, Pin } from 'lucide-react'
import { apiErrorMessage } from '../api/client'
import { useAnnouncements, useCreateAnnouncement } from '../hooks/useAnnouncements'
import { useEvents } from '../hooks/useEvents'
import { formatDateTime } from '../lib/format'
import { PageHeader } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/Feedback'

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  body: z.string().trim().min(1, 'Message is required'),
  // '' is the "Everyone" option; the API wants null for a global post.
  event_id: z.string(),
  pinned: z.boolean(),
})

function AnnouncementForm({ events }) {
  const createAnnouncement = useCreateAnnouncement()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: '', body: '', event_id: '', pinned: false },
  })

  const onSubmit = async (values) => {
    try {
      await createAnnouncement.mutateAsync({
        title: values.title,
        body: values.body,
        pinned: values.pinned,
        event_id: values.event_id === '' ? null : Number(values.event_id),
      })
      reset()
    } catch {
      // The hook surfaced the server's message; leave the draft in place.
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5" noValidate>
      <div>
        <label htmlFor="announcement-audience" className="block text-sm font-medium text-slate-700">
          Audience
        </label>
        <select
          id="announcement-audience"
          {...register('event_id')}
          className="mt-1.5 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-primary-500 focus:ring-inset"
        >
          <option value="">Everyone (global)</option>
          {events.map((event) => (
            <option key={event.id} value={String(event.id)}>
              {event.title}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Event announcements only reach people holding a ticket to it.
        </p>
      </div>

      <div>
        <label htmlFor="announcement-title" className="block text-sm font-medium text-slate-700">
          Title<span className="ml-0.5 text-red-500">*</span>
        </label>
        <input
          id="announcement-title"
          {...register('title')}
          aria-invalid={errors.title ? true : undefined}
          placeholder="Doors open at 8am"
          className="mt-1.5 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:ring-inset aria-[invalid=true]:ring-red-400"
        />
        {errors.title && <p className="mt-1 text-xs font-medium text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="announcement-body" className="block text-sm font-medium text-slate-700">
          Message<span className="ml-0.5 text-red-500">*</span>
        </label>
        <textarea
          id="announcement-body"
          rows={4}
          {...register('body')}
          aria-invalid={errors.body ? true : undefined}
          placeholder="Bring your ticket QR code — screenshots are fine."
          className="mt-1.5 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:ring-inset aria-[invalid=true]:ring-red-400"
        />
        {errors.body && <p className="mt-1 text-xs font-medium text-red-600">{errors.body.message}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="announcement-pinned"
          type="checkbox"
          {...register('pinned')}
          className="size-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="announcement-pinned" className="text-sm text-slate-700">
          Pin to the top of the feed
        </label>
      </div>

      <Button type="submit" loading={createAnnouncement.isPending} className="w-full">
        Post announcement
      </Button>
    </form>
  )
}

function AnnouncementList({ eventsById }) {
  const { data: announcements, isPending, isError, error, refetch } = useAnnouncements()

  if (isPending) {
    return (
      <div className="p-5">
        <LoadingBlock label="Loading announcements…" rows={3} />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        message={apiErrorMessage(error, 'Could not load announcements')}
        onRetry={refetch}
      />
    )
  }

  if (!announcements.length) {
    return (
      <EmptyState
        icon={Megaphone}
        title="Nothing posted yet"
        description="Announcements you post show up here and in the attendees' feed."
      />
    )
  }

  return (
    <ul className="divide-y divide-slate-100">
      {announcements.map((announcement) => {
        const event = announcement.event_id ? eventsById.get(announcement.event_id) : null
        return (
          <li key={announcement.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{announcement.title}</h3>
              {announcement.pinned && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                  <Pin aria-hidden="true" className="size-3" />
                  Pinned
                </span>
              )}
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap text-slate-600">{announcement.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                {announcement.event_id ? (
                  <>
                    <Megaphone aria-hidden="true" className="size-3" />
                    {/* An event deleted or unknown to this list still has an id. */}
                    {event?.title ?? `Event #${announcement.event_id}`}
                  </>
                ) : (
                  <>
                    <Globe aria-hidden="true" className="size-3" />
                    Everyone
                  </>
                )}
              </span>
              <span>{formatDateTime(announcement.created_at)}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function Announcements() {
  const { data: events, isPending, isError, error, refetch } = useEvents()

  if (isPending) {
    return (
      <>
        <PageHeader title="Announcements" />
        <LoadingBlock label="Loading…" rows={3} />
      </>
    )
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Announcements" />
        <Card>
          <ErrorState message={apiErrorMessage(error, 'Could not load events')} onRetry={refetch} />
        </Card>
      </>
    )
  }

  const eventsById = new Map(events.map((event) => [event.id, event]))

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Post to everyone, or to the attendees of a single event."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="New announcement" />
            <AnnouncementForm events={events} />
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader title="Posted" description="Pinned first, then newest." />
            <AnnouncementList eventsById={eventsById} />
          </Card>
        </div>
      </div>
    </>
  )
}
