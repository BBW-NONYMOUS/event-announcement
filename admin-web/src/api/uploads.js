import { client } from './client'

/** Mirrors the backend's MAX_UPLOAD_MB / accepted types. The server enforces
 *  both — these exist so the UI can say no instantly instead of pushing 40 MB
 *  up the wire to earn a 413. */
export const MAX_UPLOAD_MB = 15
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const ACCEPTED_IMAGE_LABEL = 'PNG, JPG, or WebP'

/** POST /api/admin/uploads/image → {url, filename, content_type, size} */
export async function uploadEventImage(file, { onProgress, signal } = {}) {
  const body = new FormData()
  body.append('file', file)

  const { data } = await client.post('/api/admin/uploads/image', body, {
    signal,
    // Let the browser set multipart/form-data with its own boundary.
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    },
  })
  return data
}
