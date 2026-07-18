import { client } from './client'

/** GET /api/admin/announcements — all of them. The public /api/announcements
 *  feed is scoped to the caller's tickets, so it hides most admin posts. */
export async function listAnnouncements() {
  const { data } = await client.get('/api/admin/announcements')
  return data
}

/** POST /api/admin/announcements — event_id null means global. */
export async function createAnnouncement(payload) {
  const { data } = await client.post('/api/admin/announcements', payload)
  return data
}
