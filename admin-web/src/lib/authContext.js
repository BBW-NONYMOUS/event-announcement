import { createContext } from 'react'

export const AuthContext = createContext(null)

/** Thrown after a successful login when the account is not an admin. */
export class NotAnAdminError extends Error {
  constructor() {
    super('This account is not an admin. Use an admin account to sign in.')
    this.name = 'NotAnAdminError'
  }
}
