import { useId, useRef, useState } from 'react'
import { AlertCircle, ImageUp, Link2, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { apiErrorMessage } from '../api/client'
import {
  ACCEPTED_IMAGE_LABEL,
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  uploadEventImage,
} from '../api/uploads'
import { resolveImageUrl } from '../lib/images'

const formatSize = (bytes) => {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * Upload control for Event.image_url.
 *
 * `value` is always just a URL string — uploading is one way to obtain one,
 * pasting an external link is the other, and the form only ever sees the URL.
 */
export function ImageUploadField({ value, onChange, disabled = false, error }) {
  const inputId = useId()
  const urlInputId = `${inputId}-url`
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  const [progress, setProgress] = useState(null)
  const [localError, setLocalError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)

  const uploading = progress !== null
  const message = localError ?? error

  const handleFile = async (file) => {
    if (!file) return
    setLocalError(null)

    // Instant feedback for the two things we can know without a round trip.
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      const reason = `That is a ${file.type || 'unknown'} file. Use ${ACCEPTED_IMAGE_LABEL}.`
      setLocalError(reason)
      toast.error(reason)
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      const reason = `${formatSize(file.size)} is over the ${MAX_UPLOAD_MB} MB limit.`
      setLocalError(reason)
      toast.error(reason)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setProgress(0)

    try {
      const uploaded = await uploadEventImage(file, {
        onProgress: setProgress,
        signal: controller.signal,
      })
      onChange(uploaded.url)
      toast.success('Image uploaded')
    } catch (uploadError) {
      if (uploadError.name === 'CanceledError') return
      // Surface the server's own wording (415/413/400 all send a detail).
      const reason = apiErrorMessage(uploadError, 'Could not upload the image')
      setLocalError(reason)
      toast.error(reason)
    } finally {
      abortRef.current = null
      setProgress(null)
      // Allow re-picking the same file after a failure.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = () => {
    abortRef.current?.abort()
    onChange(null)
    setLocalError(null)
  }

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">Event image</span>

      {value ? (
        <div className="mt-1.5 overflow-hidden rounded-lg border border-slate-200">
          <img
            src={resolveImageUrl(value)}
            alt="Event banner preview"
            className="h-40 w-full bg-slate-100 object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
              setLocalError('That image could not be loaded. Check the URL or upload a file.')
            }}
          />
          <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2">
            <p className="truncate text-xs text-slate-500" title={value}>
              {value.split('/').pop()}
            </p>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                <Upload aria-hidden="true" className="size-3" />
                Replace
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={disabled}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" className="size-3" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            if (!disabled && !uploading) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            if (disabled || uploading) return
            handleFile(event.dataTransfer.files?.[0])
          }}
          className={`mt-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragging ? 'border-primary-400 bg-primary-50' : 'border-slate-300 bg-white'
          } ${message ? 'border-red-300' : ''}`}
        >
          {uploading ? (
            <div>
              <Loader2
                aria-hidden="true"
                className="mx-auto size-6 animate-spin text-primary-500"
              />
              <p className="mt-2 text-sm font-medium text-slate-600">Uploading… {progress}%</p>
              <div className="mx-auto mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <ImageUp aria-hidden="true" className="mx-auto size-6 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">
                <label
                  htmlFor={inputId}
                  className="cursor-pointer font-medium text-primary-600 hover:text-primary-700"
                >
                  Choose a file
                </label>{' '}
                or drag it here
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {ACCEPTED_IMAGE_LABEL} · up to {MAX_UPLOAD_MB} MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        disabled={disabled || uploading}
        onChange={(event) => handleFile(event.target.files?.[0])}
        className="sr-only"
      />

      {message && (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-red-600">
          <AlertCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          {message}
        </p>
      )}

      {!value && !uploading && (
        <div className="mt-2">
          {showUrlInput ? (
            <div>
              <label htmlFor={urlInputId} className="text-xs font-medium text-slate-600">
                Image URL
              </label>
              <input
                id={urlInputId}
                type="url"
                defaultValue=""
                disabled={disabled}
                placeholder="https://example.com/banner.png"
                onBlur={(event) => {
                  const url = event.target.value.trim()
                  if (url) onChange(url)
                }}
                className="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:ring-inset"
              />
              <p className="mt-1 text-xs text-slate-500">
                Paste a link to an image that is already hosted somewhere.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              <Link2 aria-hidden="true" className="size-3" />
              Or paste an image URL
            </button>
          )}
        </div>
      )}
    </div>
  )
}
