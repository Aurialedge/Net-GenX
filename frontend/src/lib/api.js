// Every backend call the app makes, in one place.
// URLs, methods, bodies and credentials match the original pages exactly; only the
// hosts are read from the same VITE_* variables everywhere (auth used to hard-code them).

const env = import.meta.env

export const GATEWAY = `http://${env.VITE_IPFS_ADDRESS || 'localhost'}:${env.VITE_IPFS_PORT || 8000}`
export const AI_ENGINE = `http://${env.VITE_ML_ADDRESS || 'localhost'}:${env.VITE_ML_PORT || 5000}`
export const LEDGER = `http://${env.VITE_BLOCK_ADDRESS || 'localhost'}:${env.VITE_BLOCK_PORT || 9000}`

/** fetch + JSON with a uniform result: { ok, status, data }. Never throws for HTTP errors. */
async function request(url, options = {}) {
  const res = await fetch(url, options)
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return { ok: res.ok, status: res.status, data }
}

const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const evidenceUrl = (cid) => `${GATEWAY}/ipfs/${cid}`

export const api = {
  // ---------------------------------------------------------------- accounts
  register: ({ name, email, password }) =>
    request(`${GATEWAY}/register`, { ...json({ name, email, password }), credentials: 'include' }),
  loginUser: ({ email, password }) =>
    request(`${GATEWAY}/loginuser`, { ...json({ email, password }), credentials: 'include' }),
  loginOfficial: ({ officialId, department, password }) =>
    request(`${GATEWAY}/loginofficial`, { ...json({ officialId, department, password }), credentials: 'include' }),
  sendOtp: (number) => request(`${GATEWAY}/sendotp`, json({ number })),
  verifyOtp: (number, code) => request(`${GATEWAY}/verifyotp`, json({ number, code })),
  getCredentials: () =>
    request(`${GATEWAY}/getcredentials`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' }),
  async logout() {
    // the official page also cleared the ledger session; both calls are best-effort
    await Promise.allSettled([
      fetch(`${GATEWAY}/logout`, { method: 'GET', credentials: 'include' }),
      fetch(`${LEDGER}/logout`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } }),
    ])
  },

  // ---------------------------------------------------------------- evidence vault (IPFS)
  uploadText: (message, clientName) =>
    request(`${GATEWAY}/uploadtext`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'include',
      body: `message=${encodeURIComponent(message)}&clientName=${encodeURIComponent(clientName)}`,
    }),
  uploadFile(file, clientName) {
    const form = new FormData()
    form.append('file', file)
    if (clientName) form.append('clientName', clientName)
    return request(`${GATEWAY}/upload`, { method: 'POST', body: form, credentials: 'include' })
  },
  async getEvidenceText(cid) {
    let res = await fetch(evidenceUrl(cid))
    if (!res.ok) res = await fetch(`https://ipfs.io/ipfs/${cid}`)
    return res.text()
  },

  // ---------------------------------------------------------------- AI engine
  /** Single message or file. `file` field name follows the old page: audio / video / file. */
  predict({ message, file }) {
    const form = new FormData()
    if (file) {
      const field = file.type?.startsWith('audio') ? 'audio' : file.type?.startsWith('video') ? 'video' : 'file'
      form.append(field, file)
    } else {
      form.append('message', message)
    }
    return request(`${AI_ENGINE}/predict`, { method: 'POST', body: form })
  },
  parseTranscript: (transcript) => request(`${AI_ENGINE}/shield/transcript/parse`, json({ transcript })),
  analyzeConversation: (transcript, me) => request(`${AI_ENGINE}/shield/conversation`, json({ transcript, me })),

  // ---------------------------------------------------------------- ledger, escalation, guidance
  notarize: (cid, note) => request(`${LEDGER}/insert`, json({ cid, note })),
  getCids: () => request(`${LEDGER}/getcids`),
  escalate: (payload) => request(`${GATEWAY}/escalate`, json(payload)),
  /** { prompt } for free-form questions, or { message, category, riskScore, threatLevel, evidence, escalated } */
  guidance: (payload) => request(`${GATEWAY}/gemini`, json(payload)),
}
