import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '../api/client'
import { createEvent, listEvents, updateEvent } from '../api/events'

export const eventKeys = {
  all: ['events'],
  list: () => ['events', 'list'],
  stats: (id) => ['events', 'stats', id],
  attendees: (id) => ['events', 'attendees', id],
}

export function useEvents() {
  return useQuery({
    queryKey: eventKeys.list(),
    queryFn: listEvents,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEvent,
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
      toast.success(`"${event.title}" created`)
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not create the event'))
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEvent,
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
      toast.success(`"${event.title}" updated`)
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not update the event'))
    },
  })
}
