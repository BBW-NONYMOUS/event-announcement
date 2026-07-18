import { useQueries, useQuery } from '@tanstack/react-query'
import { getEventAttendees, getEventStats } from '../api/events'
import { eventKeys } from './useEvents'

export function useEventStats(eventId) {
  return useQuery({
    queryKey: eventKeys.stats(eventId),
    queryFn: () => getEventStats(eventId),
    enabled: Boolean(eventId),
  })
}

export function useAttendees(eventId) {
  return useQuery({
    queryKey: eventKeys.attendees(eventId),
    queryFn: () => getEventAttendees(eventId),
    enabled: Boolean(eventId),
  })
}

/**
 * Per-event stats for the dashboard.
 *
 * The API only exposes stats one event at a time, so this fans out and the
 * caller waits for all of them. Totals stay `null` until every request lands —
 * a partial sum would be a wrong number rendered as a confident one.
 */
export function useAllEventStats(events = []) {
  const results = useQueries({
    queries: events.map((event) => ({
      queryKey: eventKeys.stats(event.id),
      queryFn: () => getEventStats(event.id),
    })),
  })

  const isPending = results.some((result) => result.isPending)
  const isError = results.some((result) => result.isError)

  const perEvent = events.map((event, index) => ({
    event,
    stats: results[index]?.data ?? null,
  }))

  const complete = !isPending && !isError && results.every((result) => result.data)

  return {
    perEvent,
    isPending,
    isError,
    totals: complete
      ? results.reduce(
          (accumulator, result) => ({
            registered: accumulator.registered + result.data.registered,
            checkedIn: accumulator.checkedIn + result.data.checked_in,
            capacity: accumulator.capacity + result.data.capacity,
          }),
          { registered: 0, checkedIn: 0, capacity: 0 },
        )
      : null,
  }
}
