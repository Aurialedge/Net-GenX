// Shared vocabulary for risk results. Thresholds match the AI engine (escalation at 80).

export const CATEGORY_LABELS = {
  0: 'No threat found',
  1: 'Honeytrap',
  2: 'Phishing or fraud',
  3: 'Malware',
  4: 'Blackmail',
  5: 'Information gathering',
}

/** Short human description of each category, used under the result heading. */
export const CATEGORY_HINTS = {
  0: 'Nothing in this looks like an attempt to get sensitive information, money or access.',
  1: 'Someone is building a personal or romantic connection, often to get photos, location or unit details.',
  2: 'An attempt to get OTPs, passwords, card details or money through a fake offer, notice or official.',
  3: 'An attempt to get you to install an app, open a file or enable macros that could take over your device.',
  4: 'Pressure or threats, usually using photos, videos or chats as leverage, to get money or information.',
  5: 'Questions about postings, movements, equipment or troop numbers that should never be shared.',
}

export function riskBand(score) {
  if (score >= 80) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export const BAND_LABELS = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' }

/** What happens next for each band, in plain words. */
export const BAND_OUTCOME = {
  low: 'No action needed. Stay alert if the conversation changes.',
  medium: 'Handle this yourself with the steps below. Report it to your unit cyber cell if it continues.',
  high: 'This case has been handed over to CERT-Army. Follow the steps below now.',
}

export const ESCALATION_THRESHOLD = 80
