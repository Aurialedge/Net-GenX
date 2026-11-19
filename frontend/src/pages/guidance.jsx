import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeading, PageShell } from '@/components/app/page-shell'
import { CaseSummary, NoCase } from '@/components/guidance/case-summary'
import { Composer } from '@/components/guidance/composer'
import { Conversation } from '@/components/guidance/conversation'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const NETWORK_ERROR = 'Couldn’t reach the guidance service. Check that the gateway is running on port 8000, then try again.'

/** The last analysis saved by the report page, or null. */
function readRecord() {
  try {
    const raw = localStorage.getItem('record')
    if (!raw) return null
    const record = JSON.parse(raw)
    return record && typeof record === 'object' ? record : null
  } catch {
    return null
  }
}

/** The gateway answers with data.data = { "1": "step", "2": "step", … }. */
function toSteps(data) {
  const raw = data?.data
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([key, value]) => ({ key, text: String(value) }))
  }
  if (typeof raw === 'string' && raw.trim()) return [{ key: '1', text: raw }]
  return []
}

export default function Guidance() {
  const [record] = useState(readRecord)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const idRef = useRef(0)
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const hasFetchedOnMount = useRef(false)

  function append(message) {
    idRef.current += 1
    setMessages((prev) => [...prev, { id: idRef.current, ...message }])
  }

  async function ask(payload) {
    pendingRef.current = true
    setPending(true)
    try {
      const { ok, data } = await api.guidance(payload)
      const steps = toSteps(data)
      if (steps.length) {
        append({ role: 'assistant', steps, source: data?.source, riskScore: data?.riskScore ?? null })
      } else if (!ok) {
        const reason = typeof data?.error === 'string' ? data.error : typeof data?.message === 'string' ? data.message : null
        append({ role: 'error', text: reason ? `Couldn’t get guidance: ${reason}. Try again in a moment.` : NETWORK_ERROR })
      } else {
        append({ role: 'error', text: 'The assistant didn’t return any steps. Ask your question again.' })
      }
    } catch (err) {
      console.error('Error fetching response:', err)
      append({ role: 'error', text: NETWORK_ERROR })
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  // Brief the assistant on the real case once (the ref stops StrictMode's double run).
  useEffect(() => {
    if (hasFetchedOnMount.current) return
    hasFetchedOnMount.current = true
    if (!record?.final_prediction) return
    ask({
      message: record.reported_message || record.final_prediction,
      category: record.final_prediction,
      riskScore: record.final_risk_score,
      threatLevel: record.threat_level,
      evidence: record.details,
      escalated: !!record.escalate_cert_army,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the newest message in view.
  useEffect(() => {
    if (!messages.length && !pending) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
  }, [messages.length, pending])

  function send(text) {
    const prompt = text.trim()
    if (!prompt) {
      inputRef.current?.focus()
      return
    }
    if (pendingRef.current) return
    append({ role: 'user', text: prompt })
    setInput('')
    ask({ prompt })
  }

  const hasCase = Boolean(record?.final_prediction)

  return (
    <PageShell title="Guidance" width="narrow">
      <PageHeading
        title="Guidance"
        description="Plain steps for your last case. Ask follow-up questions in your own words."
        actions={
          <Button asChild variant="outline">
            <Link to="/upload">
              <ArrowLeft aria-hidden />
              Back to Report
            </Link>
          </Button>
        }
      />

      <div className="space-y-8">
        <section aria-label="Case">{hasCase ? <CaseSummary record={record} /> : <NoCase />}</section>

        {(messages.length > 0 || pending) && (
          <section aria-labelledby="conversation-heading" className="space-y-4">
            <h2 id="conversation-heading" className="text-lg font-semibold">
              What to Do
            </h2>
            <Conversation messages={messages} pending={pending} endRef={endRef} />
          </section>
        )}

        <section aria-label="Ask a question">
          <Composer value={input} onChange={setInput} onSend={send} pending={pending} inputRef={inputRef} />
        </section>
      </div>
    </PageShell>
  )
}
