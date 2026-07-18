import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '../api/client'
import { createAnnouncement, listAnnouncements } from '../api/announcements'

export const announcementKeys = {
  all: ['announcements'],
  list: () => ['announcements', 'list'],
}

export function useAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.list(),
    queryFn: listAnnouncements,
  })
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: (announcement) => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all })
      toast.success(`"${announcement.title}" posted`)
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not post the announcement'))
    },
  })
}
