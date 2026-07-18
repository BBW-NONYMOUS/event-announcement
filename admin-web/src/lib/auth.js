const TOKEN_KEY = 'admin_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    // Private-mode / disabled storage: treat as logged out rather than crashing.
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* empty */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* empty */
  }
}

/** Decode a JWT payload without verifying it. The server is the only authority
 *  on the role; this is for cheap UI hints before /me resolves. */
export function decodeToken(token) {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getRole(token = getToken()) {
  return decodeToken(token)?.role ?? null
}

export function isTokenExpired(token = getToken()) {
  const exp = decodeToken(token)?.exp
  if (!exp) return false
  return exp * 1000 <= Date.now()
}
