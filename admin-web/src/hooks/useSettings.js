import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '../api/client'
import { getSettings, updateSettings } from '../api/settings'

export const settingsKeys = {
  all: ['settings'],
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: getSettings,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.all, settings)
      toast.success('Settings saved')
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not save the settings'))
    },
  })
}
