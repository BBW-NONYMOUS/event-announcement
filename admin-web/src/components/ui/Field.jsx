import { useId } from 'react'

const CONTROL_CLASS =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:ring-red-400'

/**
 * Label + control + inline error, wired together by id so the label is always
 * clickable and screen readers announce the error with the field.
 */
export function Field({ label, error, hint, required = false, children }) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="mt-1.5">
        {children({
          id,
          className: CONTROL_CLASS,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': describedBy || undefined,
        })}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
