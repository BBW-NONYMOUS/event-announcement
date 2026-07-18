import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { changePassword, updateProfile } from '../api/auth'
import { apiErrorMessage } from '../api/client'

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      // AuthProvider reads this key, so the topbar name updates with no refetch.
      queryClient.setQueryData(['auth', 'me'], user)
      toast.success('Profile updated')
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not update your profile'))
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      // The current token stays valid: the API changes the hash, not the
      // session, so there is nothing to re-authenticate here.
      toast.success('Password changed')
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not change your password'))
    },
  })
}
