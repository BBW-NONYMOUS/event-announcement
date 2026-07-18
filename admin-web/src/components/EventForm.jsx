import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Star } from 'lucide-react'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { ImageUploadField } from './ImageUploadField'
import { LocationPicker } from './LocationPicker'

const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

/** Empty string -> undefined, so optional numeric fields stay optional. */
const optionalNumber = (min, max, label) =>
  z
    .union([z.literal(''), z.coerce.number().min(min, `${label} must be ≥ ${min}`).max(max, `${label} must be ≤ ${max}`)])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : Number(value)))

const schema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
    description: z.string().trim().min(1, 'Description is required'),
    venue: z.string().trim().min(1, 'Venue is required').max(255, 'Venue is too long'),
    latitude: optionalNumber(-90, 90, 'Latitude'),
    longitude: optionalNumber(-180, 180, 'Longitude'),
    event_date: z.string().min(1, 'Date is required'),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    capacity: z.coerce
      .number({ message: 'Capacity is required' })
      .int('Capacity must be a whole number')
      .positive('Capacity must be greater than 0'),
    price: z.coerce.number({ message: 'Price is required' }).min(0, 'Price cannot be negative'),
    category: z.string().trim().min(1, 'Category is required').max(50, 'Category is too long'),
    // Either an uploaded image or a pasted link, or nothing at all.
    // Uploads are stored host-relative ("/uploads/x.png") so the uploader's
    // host never gets persisted, so a plain .url() check would reject exactly
    // the images we just uploaded.
    image_url: z
      .union([z.literal(''), z.null(), z.string().max(500, 'URL is too long')])
      .optional()
      .transform((value) => value || null)
      .refine((value) => value === null || value.startsWith('/') || isHttpUrl(value), {
        message: 'Enter a valid image URL, or upload a file',
      }),
    status: z.enum(['open', 'closed', 'cancelled']),
    is_featured: z.boolean(),
  })
  // Featuring is a promotion slot on the mobile home screen, and only open
  // events appear there at all — so featuring a closed one would silently
  // do nothing.
  .refine((data) => !(data.is_featured && data.status !== 'open'), {
    message: 'Only open events can be featured',
    path: ['is_featured'],
  })
  .refine((data) => data.end_time > data.start_time, {
    message: 'End time must be after the start time',
    path: ['end_time'],
  })
  // Coordinates only mean something as a pair.
  .refine((data) => !(data.latitude !== null && data.longitude === null), {
    message: 'Add a longitude too, or clear the latitude',
    path: ['longitude'],
  })
  .refine((data) => !(data.longitude !== null && data.latitude === null), {
    message: 'Add a latitude too, or clear the longitude',
    path: ['latitude'],
  })

/** Only new events must be in the future — an existing one may legitimately
 *  be in the past and still need editing. */
const createSchema = schema.refine(
  (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(`${data.event_date}T00:00:00`) >= today
  },
  { message: 'The date cannot be in the past', path: ['event_date'] },
)

const toTimeInput = (value) => (value ? value.slice(0, 5) : '')

/** `appDefaults` comes from Settings; a new event starts from those, an
 *  existing one always from its own saved values. */
function toDefaults(event, appDefaults) {
  if (!event) {
    return {
      title: '',
      description: '',
      venue: '',
      latitude: '',
      longitude: '',
      event_date: '',
      start_time: '',
      end_time: '',
      capacity: '',
      price: '0',
      category: appDefaults?.category ?? 'General',
      image_url: null,
      status: appDefaults?.status ?? 'open',
      is_featured: false,
    }
  }

  return {
    title: event.title ?? '',
    description: event.description ?? '',
    venue: event.venue ?? '',
    latitude: event.latitude ?? '',
    longitude: event.longitude ?? '',
    event_date: event.event_date ?? '',
    start_time: toTimeInput(event.start_time),
    end_time: toTimeInput(event.end_time),
    capacity: String(event.capacity ?? ''),
    price: String(event.price ?? '0'),
    category: event.category ?? 'General',
    image_url: event.image_url ?? null,
    status: event.status ?? 'open',
    is_featured: event.is_featured ?? false,
  }
}

export function EventForm({ event, onSubmit, onCancel, pending = false, appDefaults }) {
  const isEdit = Boolean(event)

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEdit ? schema : createSchema),
    defaultValues: toDefaults(event, appDefaults),
  })

  // The map and the numeric fields are two views of the same pair of values.
  // useWatch rather than watch(): the latter can't be memoized, so it makes
  // React Compiler bail out of optimizing this whole form.
  const latitude = useWatch({ control, name: 'latitude' })
  const longitude = useWatch({ control, name: 'longitude' })

  const submit = (values) => {
    onSubmit({
      ...values,
      // The API takes HH:MM:SS; <input type="time"> gives HH:MM.
      start_time: `${values.start_time}:00`,
      end_time: `${values.end_time}:00`,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="max-h-[65vh] space-y-4 overflow-y-auto px-5 py-4">
        <Field label="Title" required error={errors.title?.message}>
          {(props) => (
            <input {...props} {...register('title')} placeholder="React Native Summit" />
          )}
        </Field>

        <Field label="Description" required error={errors.description?.message}>
          {(props) => (
            <textarea {...props} {...register('description')} rows={3} placeholder="A day of talks." />
          )}
        </Field>

        <Field label="Venue" required error={errors.venue?.message}>
          {(props) => (
            <input {...props} {...register('venue')} placeholder="Metro Convention Center" />
          )}
        </Field>

        {/* Coordinates are optional and only meaningful as a pair, so the
            picker always sets or clears both together. */}
        <div>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            disabled={pending}
            onChange={(lat, lng) => {
              setValue('latitude', lat, { shouldValidate: true, shouldDirty: true })
              setValue('longitude', lng, { shouldValidate: true, shouldDirty: true })
            }}
            onClear={() => {
              setValue('latitude', '', { shouldValidate: true, shouldDirty: true })
              setValue('longitude', '', { shouldValidate: true, shouldDirty: true })
            }}
          />
          {(errors.latitude || errors.longitude) && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {errors.latitude?.message ?? errors.longitude?.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date" required error={errors.event_date?.message}>
            {(props) => <input {...props} {...register('event_date')} type="date" />}
          </Field>

          <Field label="Start time" required error={errors.start_time?.message}>
            {(props) => <input {...props} {...register('start_time')} type="time" />}
          </Field>

          <Field label="End time" required error={errors.end_time?.message}>
            {(props) => <input {...props} {...register('end_time')} type="time" />}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Capacity" required error={errors.capacity?.message}>
            {(props) => (
              <input {...props} {...register('capacity')} type="number" min="1" placeholder="100" />
            )}
          </Field>

          <Field label="Price" required error={errors.price?.message} hint="0 means free">
            {(props) => (
              <input
                {...props}
                {...register('price')}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            )}
          </Field>

          <Field label="Category" required error={errors.category?.message}>
            {(props) => <input {...props} {...register('category')} placeholder="General" />}
          </Field>
        </div>

        {/* Uploading and pasting a link both just produce a URL string. */}
        <Controller
          control={control}
          name="image_url"
          render={({ field, fieldState }) => (
            <ImageUploadField
              value={field.value || null}
              onChange={field.onChange}
              disabled={pending}
              error={fieldState.error?.message}
            />
          )}
        />

        <Field label="Status" error={errors.status?.message}>
          {(props) => (
            <select {...props} {...register('status')}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </Field>

        <div>
          <div className="flex items-center gap-2">
            <input
              id="event-featured"
              type="checkbox"
              {...register('is_featured')}
              aria-invalid={errors.is_featured ? true : undefined}
              aria-describedby="event-featured-hint"
              className="size-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="event-featured" className="inline-flex items-center gap-1.5 text-sm text-slate-700">
              <Star aria-hidden="true" className="size-3.5 text-amber-500" />
              Feature on the mobile home screen
            </label>
          </div>
          {errors.is_featured ? (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.is_featured.message}</p>
          ) : (
            <p id="event-featured-hint" className="mt-1 text-xs text-slate-500">
              Featured events lead the attendees' event list and scroll in the highlight strip.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {isEdit ? 'Save changes' : 'Create event'}
        </Button>
      </div>
    </form>
  )
}
