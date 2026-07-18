import axios from 'axios'
import { toast } from 'sonner'
import { clearToken, getToken } from '../lib/auth'

const baseURL = import.meta.env.VITE_API_URL

if (!baseURL) {
  throw new Error('VITE_API_URL is not set. Copy .env.example to .env and set it.')
}

export const client = axios.create({ baseURL })

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** A failed login legitimately returns 401 — that is a form error to show
 *  inline, not a session expiry to redirect on. */
const isLoginRequest = (config) => Boolean(config?.url?.includes('/api/auth/login'))

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401 && !isLoginRequest(error.config)) {
      clearToken()
      if (window.location.pathname !== '/login') {
        window.location.replace('/login?expired=1')
      }
    }

    if (status === 403) {
      toast.error('Admin access required')
    }

    return Promise.reject(error)
  },
)

/**
 * Pull a human message out of a FastAPI error response.
 *
 * `detail` arrives in three shapes: a plain string, a 422 validation array, or
 * an object (check-in's 409 sends `{message, checked_in_at}`). Rendering the
 * raw value would print "[object Object]" for the last two.
 */
export function apiErrorMessage(error, fallback = 'Something went wrong') {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    const first = detail[0]
    if (!first) return fallback
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : null
    return field ? `${field}: ${first.msg}` : (first.msg ?? fallback)
  }

  if (detail && typeof detail === 'object') {
    return detail.message ?? fallback
  }

  if (error?.response) return fallback
  // No response at all: the network or CORS failed.
  if (error?.request) return 'Cannot reach the server. Is the backend running?'
  return error?.message ?? fallback
}
