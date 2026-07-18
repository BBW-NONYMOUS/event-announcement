import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { NotAnAdminError } from '../lib/authContext'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export function Login() {
  const { token, isAdmin, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  // The 401 interceptor redirects here with ?expired=1 when a session dies.
  useEffect(() => {
    if (new URLSearchParams(location.search).has('expired')) {
      toast.info('Your session expired. Please sign in again.')
    }
  }, [location.search])

  if (token && isAdmin) {
    return <Navigate to={location.state?.from ?? '/'} replace />
  }

  const onSubmit = async (values) => {
    setFormError(null)
    try {
      const user = await login(values)
      toast.success(`Welcome back, ${user.name}`)
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (error) {
      // Show the server's own wording; only the admin gate is ours.
      setFormError(
        error instanceof NotAnAdminError
          ? error.message
          : apiErrorMessage(error, 'Could not sign in'),
      )
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-primary-600">
            <Ticket aria-hidden="true" className="size-6 text-white" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
            Event Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage events and check-in.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <Field label="Email" required error={errors.email?.message}>
              {(props) => (
                <input
                  {...props}
                  {...register('email')}
                  type="email"
                  autoComplete="username"
                  placeholder="admin@example.com"
                />
              )}
            </Field>

            <Field label="Password" required error={errors.password?.message}>
              {(props) => (
                <input
                  {...props}
                  {...register('password')}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              )}
            </Field>

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Admin accounts only. Attendees use the mobile app.
        </p>
      </div>
    </div>
  )
}
