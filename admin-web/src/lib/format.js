import { format, isValid, parse, parseISO } from 'date-fns'

/** The API sends dates as `2026-08-14` and times as `09:00:00`. */

export function formatEventDate(isoDate) {
  if (!isoDate) return '—'
  const date = parseISO(isoDate)
  return isValid(date) ? format(date, 'EEE, d MMM yyyy') : isoDate
}

export function formatEventDateShort(isoDate) {
  if (!isoDate) return '—'
  const date = parseISO(isoDate)
  return isValid(date) ? format(date, 'd MMM yyyy') : isoDate
}

export function formatTime(value) {
  if (!value) return '—'
  const time = parse(value, 'HH:mm:ss', new Date())
  return isValid(time) ? format(time, 'h:mm a') : value
}

export function formatTimeRange(start, end) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** Full timestamps (checked_in_at) arrive as ISO 8601 with an offset. */
export function formatDateTime(isoString) {
  if (!isoString) return '—'
  const date = parseISO(isoString)
  return isValid(date) ? format(date, "d MMM yyyy 'at' h:mm a") : isoString
}

export function formatCurrency(value) {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return '—'
  if (amount === 0) return 'Free'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
  }).format(amount)
}
