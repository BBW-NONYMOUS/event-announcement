import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Star } from 'lucide-react'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { useChangePassword, useUpdateProfile } from '../hooks/useProfile'
import { useSettings, useUpdateSettings } from '../hooks/useSettings'
import { PageHeader } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { ErrorState, LoadingBlock } from '../components/ui/Feedback'
import { Field } from '../components/ui/Field'

// --- Profile ---------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
})

function ProfileCard() {
  const { user } = useAuth()
  const updateProfile = useUpdateProfile()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  })

  // The shell renders this page only once /me has resolved, but a background
  // refetch can still replace the user underneath a pristine form.
  useEffect(() => {
    if (user) reset({ name: user.name, email: user.email })
  }, [user, reset])

  const onSubmit = async (values) => {
    try {
      const updated = await updateProfile.mutateAsync(values)
      reset({ name: updated.name, email: updated.email })
    } catch {
      // The hook toasted the server's message; keep the edits on screen.
    }
  }

  return (
    <Card>
      <CardHeader title="Profile" description="How you appear in this console." />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5" noValidate>
        <Field label="Name" required error={errors.name?.message}>
          {(props) => <input {...props} {...register('name')} autoComplete="name" />}
        </Field>

        <Field
          label="Email"
          required
          error={errors.email?.message}
          hint="You sign in with this address."
        >
          {(props) => (
            <input {...props} {...register('email')} type="email" autoComplete="email" />
          )}
        </Field>

        <div className="flex justify-end">
          <Button type="submit" loading={updateProfile.isPending} disabled={!isDirty}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  )
}

// --- Password --------------------------------------------------------------

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(72, 'Use at most 72 characters'),
    confirmPassword: z.string().min(1, 'Repeat the new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'The passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'The new password must differ from the current one',
    path: ['newPassword'],
  })

function PasswordCard() {
  const changePassword = useChangePassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (values) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      // Never leave a password sitting in a live input once it is saved.
      reset()
    } catch {
      // Wrong current password, most likely — the hook has already said so.
    }
  }

  return (
    <Card>
      <CardHeader
        title="Password"
        description="Your session stays signed in after a change."
      />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5" noValidate>
        <Field label="Current password" required error={errors.currentPassword?.message}>
          {(props) => (
            <input
              {...props}
              {...register('currentPassword')}
              type="password"
              autoComplete="current-password"
            />
          )}
        </Field>

        <Field
          label="New password"
          required
          error={errors.newPassword?.message}
          hint="At least 8 characters."
        >
          {(props) => (
            <input
              {...props}
              {...register('newPassword')}
              type="password"
              autoComplete="new-password"
            />
          )}
        </Field>

        <Field label="Confirm new password" required error={errors.confirmPassword?.message}>
          {(props) => (
            <input
              {...props}
              {...register('confirmPassword')}
              type="password"
              autoComplete="new-password"
            />
          )}
        </Field>

        <div className="flex justify-end">
          <Button type="submit" loading={changePassword.isPending}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  )
}

// --- App + featured settings ----------------------------------------------

const appSettingsSchema = z.object({
  default_category: z
    .string()
    .trim()
    .min(1, 'Default category is required')
    .max(50, 'Category is too long'),
  default_event_status: z.enum(['open', 'closed', 'cancelled']),
  max_featured: z.coerce
    .number({ message: 'Enter a number' })
    .int('Use a whole number')
    .min(0, 'Cannot be negative')
    .max(50, 'Cannot be more than 50'),
  show_featured_marquee: z.boolean(),
})

function AppSettingsForm({ settings }) {
  const updateSettings = useUpdateSettings()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      default_category: settings.default_category,
      default_event_status: settings.default_event_status,
      max_featured: String(settings.max_featured),
      show_featured_marquee: settings.show_featured_marquee,
    },
  })

  const onSubmit = async (values) => {
    try {
      const saved = await updateSettings.mutateAsync(values)
      reset({
        default_category: saved.default_category,
        default_event_status: saved.default_event_status,
        max_featured: String(saved.max_featured),
        show_featured_marquee: saved.show_featured_marquee,
      })
    } catch {
      // The hook toasted the server's message.
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-6 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Default category"
            required
            error={errors.default_category?.message}
            hint="Prefilled on the new-event form."
          >
            {(props) => <input {...props} {...register('default_category')} />}
          </Field>

          <Field
            label="Default event status"
            error={errors.default_event_status?.message}
            hint="What a new event starts as."
          >
            {(props) => (
              <select {...props} {...register('default_event_status')}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
          </Field>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Star aria-hidden="true" className="size-3.5 text-amber-500" />
            Featured events
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            These apply to the attendees' mobile app, not just this console.
          </p>

          <div className="mt-4 space-y-4">
            <Field
              label="Maximum featured at once"
              error={errors.max_featured?.message}
              hint="Featuring another event past this is refused. 0 turns featuring off."
            >
              {(props) => (
                <input {...props} {...register('max_featured')} type="number" min="0" max="50" />
              )}
            </Field>

            <div className="flex items-start gap-2">
              <input
                id="settings-marquee"
                type="checkbox"
                {...register('show_featured_marquee')}
                className="mt-0.5 size-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="settings-marquee" className="text-sm text-slate-700">
                Show the scrolling highlight strip
                <span className="block text-xs text-slate-500">
                  The marquee across the top of the app's home screen. Featured events still
                  lead the list when this is off.
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200 px-5 py-3">
        <Button type="submit" loading={updateSettings.isPending} disabled={!isDirty}>
          Save settings
        </Button>
      </div>
    </form>
  )
}

function AppSettingsCard() {
  const { data: settings, isPending, isError, error, refetch } = useSettings()

  return (
    <Card>
      <CardHeader title="App settings" description="Defaults and attendee-facing behaviour." />
      {isPending && (
        <div className="p-5">
          <LoadingBlock label="Loading settings…" rows={3} />
        </div>
      )}
      {isError && (
        <ErrorState message={apiErrorMessage(error, 'Could not load settings')} onRetry={refetch} />
      )}
      {/* Remount per settings identity so the form's defaults reload. */}
      {!isPending && !isError && (
        <AppSettingsForm key={settings.updated_at} settings={settings} />
      )}
    </Card>
  )
}

export function Settings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account, and the defaults this console and the mobile app run on."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ProfileCard />
          <PasswordCard />
        </div>
        <AppSettingsCard />
      </div>
    </>
  )
}
