// Small helpers shared by the sign-in forms.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const NETWORK_ERROR =
  'Couldn’t reach the sign-in service. Check that the gateway is running on port 8000, then try again.'

/** Validation message for an email field ('' when fine). */
export function emailError(value) {
  const v = value.trim()
  if (!v) return 'Enter your email address.'
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address, like officer@army.mil.'
  return ''
}

/** Moves focus to the first field (in `order`) that has an error. */
export function focusFirstError(errors, order) {
  const first = order.find((key) => errors[key])
  if (first) document.getElementById(first)?.focus()
}

/** "+91-9876543210" -> "+91-98•••••210". Keeps the country code, first 2 and last 3 digits. */
export function maskPhone(number) {
  if (!number) return ''
  const match = String(number).match(/^(\+\d{1,3}[-\s]?)?(.*)$/)
  const prefix = match?.[1] ?? ''
  const digits = (match?.[2] ?? '').replace(/\D/g, '')
  if (digits.length <= 5) return `${prefix}${digits}`
  return `${prefix}${digits.slice(0, 2)}${'•'.repeat(digits.length - 5)}${digits.slice(-3)}`
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Demo accounts shown in the collapsible hint (seeded in the gateway's data store).
export const DEMO_PERSONNEL = { email: 'officer@army.mil', password: 'Password123' }
export const DEMO_OFFICIAL = { officialId: 'ARMY-CERT-01', department: 'defense', password: 'DefShield@2025', code: '123456' }
