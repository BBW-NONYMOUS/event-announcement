/** Short tones for the check-in desk, so an operator can keep their eyes on
 *  the queue instead of the screen. Synthesised to avoid shipping audio files. */

let audioContext = null

function context() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContextClass) return null
  audioContext ??= new AudioContextClass()
  return audioContext
}

function tone(frequency, durationMs, startOffsetMs = 0) {
  const ctx = context()
  if (!ctx) return

  const startAt = ctx.currentTime + startOffsetMs / 1000
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.15, startAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000)

  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + durationMs / 1000 + 0.02)
}

function play(fn) {
  try {
    const ctx = context()
    // Browsers start the context suspended until a user gesture.
    if (ctx?.state === 'suspended') ctx.resume()
    fn()
  } catch {
    // Audio is a nicety — never let it break a check-in.
  }
}

export const playSuccess = () => play(() => tone(880, 120))
export const playWarning = () => play(() => {
  tone(600, 110)
  tone(600, 110, 160)
})
export const playError = () => play(() => tone(240, 260))
