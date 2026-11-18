// Helpers for ledger records: { cid, note, timestamp?, blockNumber? }.
// note format: "<score> <Category_With_Underscores> <inputType>".
import { ESCALATION_THRESHOLD } from '@/lib/risk'

const INPUT_TYPES = ['file', 'image', 'message', 'chat_history', 'audio', 'video']

export function getRiskScore(note) {
  return parseFloat(note?.split(' ')[0]) || 0
}

/** Same parsing as the old official page. */
export function parseNote(note) {
  const words = (note || '').split(' ')
  const score = parseFloat(words[0]) || 0
  const label = words.slice(1, -1).join(' ') || words[1] || 'Incident Report'
  const last = words[words.length - 1]?.toLowerCase()
  return {
    score,
    category: label.replace(/_/g, ' '),
    type: INPUT_TYPES.includes(last) ? last : 'message',
  }
}

// Same bands as the rest of the app: 80+ is the CERT-Army escalation threshold (the old page used 75,
// which disagreed with the risk badge and with what the AI engine actually escalates).
export const FILTERS = [
  { value: 'all', label: 'All', test: () => true },
  { value: 'high', label: 'High', range: '80+', test: (s) => s >= ESCALATION_THRESHOLD },
  { value: 'medium', label: 'Medium', range: '40–79', test: (s) => s >= 40 && s < ESCALATION_THRESHOLD },
  { value: 'low', label: 'Low', range: 'Below 40', test: (s) => s < 40 },
]

export const TYPE_LABELS = {
  message: 'Message',
  chat_history: 'Chat History',
  file: 'File',
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
}

export function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}

/** Ledger timestamps are Unix seconds. Returns null when missing or invalid. */
export function toDate(timestamp) {
  if (timestamp === undefined || timestamp === null || timestamp === '') return null
  const d = new Date(Number(timestamp) * 1000)
  return Number.isNaN(d.getTime()) ? null : d
}
