import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { login as loginRequest, me } from '../api/auth'
import { AuthContext, NotAnAdminError } from '../lib/authContext'
import { clearToken, getToken, isTokenExpired, setToken } from '../lib/auth'

function initialToken() {
  const token = getToken()
  if (!token) return null
  // Don't bother restoring a session the server will reject anyway.
  if (isTokenExpired(token)) {
    clearToken()
    return null
  }
  return token
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(initialToken)
  const queryClient = useQueryClient()

  // The server is the authority on the role — the JWT claim is only a hint.
  const {
    data: user,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: me,
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    queryClient.clear()
  }, [queryClient])

  const login = useCallback(
    async ({ email, password }) => {
      const { access_token: accessToken } = await loginRequest({ email, password })
      setToken(accessToken)

      let profile
      try {
        profile = await queryClient.fetchQuery({ queryKey: ['auth', 'me'], queryFn: me })
      } catch (error) {
        clearToken()
        throw error
      }

      if (profile.role !== 'admin') {
        // Credentials were valid, but this console is admin-only.
        clearToken()
        queryClient.removeQueries({ queryKey: ['auth', 'me'] })
        throw new NotAnAdminError()
      }

      setTokenState(accessToken)
      return profile
    },
    [queryClient],
  )

  const value = useMemo(
    () => ({
      token,
      user: user ?? null,
      login,
      logout,
      isAdmin: user?.role === 'admin',
      // A restored token is unresolved until /me answers.
      isLoading: Boolean(token) && isPending,
      isError,
    }),
    [token, user, login, logout, isPending, isError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
