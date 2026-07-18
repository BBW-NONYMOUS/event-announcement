import { client } from './client'

/** POST /api/auth/login — OAuth2 form-encoded, not JSON. */
export async function login({ email, password }) {
  const body = new URLSearchParams()
  body.append('username', email)
  body.append('password', password)

  const { data } = await client.post('/api/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

/** GET /api/auth/me */
export async function me() {
  const { data } = await client.get('/api/auth/me')
  return data
}

/** PATCH /api/auth/me — partial; omitted fields keep their value. */
export async function updateProfile(payload) {
  const { data } = await client.patch('/api/auth/me', payload)
  return data
}

/** POST /api/auth/me/password — 204, no body. */
export async function changePassword({ currentPassword, newPassword }) {
  await client.post('/api/auth/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}
