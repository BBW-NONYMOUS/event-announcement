import { client } from './client'

/** POST /api/admin/checkin — body {ticket_code}.
 *  Resolves to {ticket, user, event}; callers read the status off the error. */
export async function postCheckin(ticketCode) {
  const { data } = await client.post('/api/admin/checkin', { ticket_code: ticketCode })
  return data
}
