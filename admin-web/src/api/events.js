import { client } from './client'

/** GET /api/admin/events — every event, any status. The public /api/events
 *  only returns open ones, which would hide what an admin just closed. */
export async function listEvents() {
  const { data } = await client.get('/api/admin/events')
  return data
}

/** POST /api/admin/events */
export async function createEvent(payload) {
  const { data } = await client.post('/api/admin/events', payload)
  return data
}

/** PUT /api/admin/events/{id} — also how status becomes closed/cancelled. */
export async function updateEvent({ id, ...payload }) {
  const { data } = await client.put(`/api/admin/events/${id}`, payload)
  return data
}

/** GET /api/admin/events/{id}/stats */
export async function getEventStats(id) {
  const { data } = await client.get(`/api/admin/events/${id}/stats`)
  return data
}

/** GET /api/admin/events/{id}/attendees */
export async function getEventAttendees(id) {
  const { data } = await client.get(`/api/admin/events/${id}/attendees`)
  return data
}
