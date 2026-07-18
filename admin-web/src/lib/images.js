/**
 * Turn an `image_url` into something the browser can fetch.
 *
 * Uploaded images are stored host-relative (`/uploads/x.png`) so that the
 * uploader's host never gets persisted — see the backend's uploads service.
 * That means a bare `/uploads/...` would otherwise resolve against the Vite
 * dev server rather than the API, so join it onto VITE_API_URL here.
 * Externally hosted images are already absolute and pass through untouched.
 */
export function resolveImageUrl(value) {
  if (!value) return null
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value

  const base = import.meta.env.VITE_API_URL.replace(/\/$/, '')
  return `${base}${value.startsWith('/') ? '' : '/'}${value}`
}
