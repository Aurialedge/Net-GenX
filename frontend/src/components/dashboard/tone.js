// Shared colour + wording helpers for the dashboard result views (tokens only).
import { AI_ENGINE } from '@/lib/api'

/** Status colours for a 0–100 score: same bands as RiskBadge (80 / 40). */
export function scoreTone(score) {
  if (score >= 80) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export const TONE_CHIP = {
  low: 'border-success/30 bg-success-muted text-success-foreground',
  medium: 'border-warning/40 bg-warning-muted text-warning-foreground',
  high: 'border-danger/30 bg-danger-muted text-danger-foreground',
  neutral: 'border-border bg-muted text-muted-foreground',
}

export const TONE_BAR = { low: 'bg-success', medium: 'bg-warning', high: 'bg-danger' }

/** "HIGH_RISK" -> "High risk", "pressure_tactics" -> "Pressure tactics". */
export function humanise(value) {
  if (value == null) return ''
  const s = String(value).replaceAll('_', ' ').trim().toLowerCase()
  // keep acronyms readable: "possibly ai generated" -> "Possibly AI generated"
  const fixed = s.replace(/\b(ai|otp|opsec|mi|co|upi|apk|url|cert|llm|id)\b/g, (w) => w.toUpperCase())
  return fixed.charAt(0).toUpperCase() + fixed.slice(1)
}

/** Turns a thrown fetch error into something the user can act on. */
export function describeError(err) {
  if (err instanceof TypeError) return `Couldn’t reach the AI engine at ${AI_ENGINE}. Check that it’s running, then try again.`
  return err?.message || 'Something went wrong. Try again.'
}
