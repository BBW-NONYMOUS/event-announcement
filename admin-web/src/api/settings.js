import { client } from './client'

/** GET /api/admin/settings — the full settings row, admin-only. */
export async function getSettings() {
  const { data } = await client.get('/api/admin/settings')
  return data
}

/** PUT /api/admin/settings — partial; omitted fields keep their value. */
export async function updateSettings(payload) {
  const { data } = await client.put('/api/admin/settings', payload)
  return data
}
