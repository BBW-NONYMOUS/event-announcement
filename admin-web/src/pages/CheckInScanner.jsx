import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, CameraOff, History } from 'lucide-react'
import { toast } from 'sonner'
import { postCheckin } from '../api/checkin'
import { apiErrorMessage } from '../api/client'
import { eventKeys } from '../hooks/useEvents'
import { formatDateTime } from '../lib/format'
import { playError, playSuccess, playWarning } from '../lib/sound'
import { PageHeader } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { CheckinResult } from '../components/CheckinResult'

const CAMERA_REGION_ID = 'checkin-camera-region'
/** Ignore the same code re-decoding while it is still in front of the lens. */
const RESCAN_COOLDOWN_MS = 3000

/** Turn an axios failure into the shape CheckinResult renders. */
function toErrorResult(error) {
  const status = error?.response?.status
  const detail = error?.response?.data?.detail

  // 409 sends {message, checked_in_at} rather than a plain string.
  if (status === 409 && detail && typeof detail === 'object') {
    return {
      kind: 'error',
      status,
      message: detail.message ?? 'Ticket already checked in',
      checkedInAt: detail.checked_in_at ?? null,
    }
  }

  // ticket_code is a UUID server-side, so a mistyped code fails validation
  // before it is ever looked up.
  if (status === 422) {
    return {
      kind: 'error',
      status,
      message: 'That is not a valid ticket code.',
      checkedInAt: null,
    }
  }

  return {
    kind: 'error',
    status: status ?? 0,
    message: apiErrorMessage(error, 'Check-in failed'),
    checkedInAt: null,
  }
}

export function CheckInScanner() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [cameraOn, setCameraOn] = useState(false)

  const inputRef = useRef(null)
  const scannerRef = useRef(null)
  const lastScanRef = useRef({ code: null, at: 0 })
  const queryClient = useQueryClient()

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const checkin = useMutation({
    mutationFn: postCheckin,
    onSuccess: (data) => {
      setResult({ kind: 'success', data })
      setHistory((entries) =>
        [
          {
            id: `${data.ticket.id}-${Date.now()}`,
            name: data.user.name,
            event: data.event.title,
            at: data.ticket.checked_in_at,
            ok: true,
          },
          ...entries,
        ].slice(0, 8),
      )
      playSuccess()
      toast.success(`${data.user.name} checked in`)
      // The stat cards and attendee list are now stale.
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
    onError: (error) => {
      const errorResult = toErrorResult(error)
      setResult(errorResult)
      setHistory((entries) =>
        [
          {
            id: `err-${Date.now()}`,
            name: errorResult.message,
            event: null,
            at: new Date().toISOString(),
            ok: false,
          },
          ...entries,
        ].slice(0, 8),
      )

      if (errorResult.status === 409) {
        playWarning()
        toast.warning(errorResult.message)
      } else {
        playError()
        toast.error(errorResult.message)
      }
    },
    onSettled: () => {
      // Always clear and refocus so the next scan just works.
      setCode('')
      focusInput()
    },
  })

  const submitCode = useCallback(
    (raw) => {
      const trimmed = raw.trim()
      if (!trimmed || checkin.isPending) return
      checkin.mutate(trimmed)
    },
    [checkin],
  )

  // `submitCode` changes identity every render (the mutation object does), and
  // the camera effect must not restart the video stream that often. Read the
  // latest one through a ref instead of depending on it.
  const submitCodeRef = useRef(submitCode)
  useEffect(() => {
    submitCodeRef.current = submitCode
  })

  useEffect(() => {
    focusInput()
  }, [focusInput])

  // --- Camera -------------------------------------------------------------
  useEffect(() => {
    if (!cameraOn) return undefined

    let cancelled = false
    let scanner = null

    const onDecoded = (decodedText) => {
      const now = Date.now()
      const { code: lastCode, at } = lastScanRef.current
      if (decodedText === lastCode && now - at < RESCAN_COOLDOWN_MS) return
      lastScanRef.current = { code: decodedText, at: now }
      submitCodeRef.current(decodedText)
    }

    // Imported lazily: html5-qrcode is heavy and only this page needs it.
    import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        if (cancelled) return
        scanner = new Html5Qrcode(CAMERA_REGION_ID)
        scannerRef.current = scanner
        return scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onDecoded,
          // Per-frame decode misses are normal; ignore them.
          () => {},
        )
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(
          error?.name === 'NotAllowedError'
            ? 'Camera permission denied. Allow camera access or type codes manually.'
            : 'Could not start the camera. Type codes manually instead.',
        )
        setCameraOn(false)
      })

    return () => {
      cancelled = true
      const active = scannerRef.current
      scannerRef.current = null
      if (active?.isScanning) {
        active
          .stop()
          .then(() => active.clear())
          .catch(() => {})
      }
    }
  }, [cameraOn])

  return (
    <>
      <PageHeader
        title="Check-in"
        description="Scan a ticket QR code, or type the code and press Enter."
        action={
          <Button
            variant={cameraOn ? 'secondary' : 'primary'}
            onClick={() => setCameraOn((on) => !on)}
          >
            {cameraOn ? (
              <>
                <CameraOff aria-hidden="true" className="size-4" />
                Stop camera
              </>
            ) : (
              <>
                <Camera aria-hidden="true" className="size-4" />
                Use camera
              </>
            )}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="p-5">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                submitCode(code)
              }}
            >
              <label htmlFor="ticket-code" className="block text-sm font-medium text-slate-700">
                Ticket code
              </label>
              <div className="mt-2 flex gap-2">
                {/* Deliberately never disabled: a disabled input drops focus,
                    and .focus() on it is a no-op, which would break the
                    refocus-after-every-scan loop a scanner gun depends on.
                    submitCode ignores input while a request is in flight. */}
                <input
                  id="ticket-code"
                  ref={inputRef}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                  placeholder="Scan or type, then press Enter"
                  className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:font-sans placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                />
                <Button type="submit" loading={checkin.isPending} disabled={!code.trim()}>
                  Check in
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                The field stays focused for scanner guns — it clears itself after every attempt.
              </p>
            </form>
          </Card>

          {cameraOn && (
            <Card className="overflow-hidden">
              <div id={CAMERA_REGION_ID} className="bg-slate-900 [&_video]:w-full" />
              <p className="px-5 py-3 text-xs text-slate-500">
                Hold the attendee&apos;s QR code inside the frame.
              </p>
            </Card>
          )}

          {history.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
                <History aria-hidden="true" className="size-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">This session</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span
                      aria-hidden="true"
                      className={`size-1.5 shrink-0 rounded-full ${
                        entry.ok ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{entry.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDateTime(entry.at).split(' at ')[1] ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="lg:sticky lg:top-22 lg:self-start">
          <CheckinResult result={result} />
        </div>
      </div>
    </>
  )
}
