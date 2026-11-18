import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, CircleAlert, Copy, ExternalLink, MessagesSquare, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { RiskMeter } from '@/components/app/risk-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { BAND_OUTCOME, CATEGORY_HINTS, CATEGORY_LABELS, riskBand } from '@/lib/risk'
import { ConversationTimeline } from './conversation-timeline'
import { CounterIntelPanel } from './counter-intel-panel'

// Where the shown steps came from (same states as the original page).
function sourceLabel(source, escalated) {
  return {
    loading: 'Writing personalised steps with Gemini…',
    gemini: 'Personalised steps written by Gemini.',
    rules: 'Gemini is unavailable, so these steps come from the NetGenX defence playbook.',
    model: escalated ? 'Case handed to CERT-Army. Take these containment steps now.' : 'Steps from the NetGenX AI engine.',
  }[source]
}

function EscalationNotice({ escalation, countdown, onCancelCountdown }) {
  if (!escalation) return null
  if (escalation.state === 'failed') {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Handover to CERT-Army failed</AlertTitle>
        <AlertDescription>
          This is a high-risk case, but we couldn’t send it to CERT-Army. Report it to your unit cyber cell now. You can also
          call the national cyber-crime helpline 1930 or use cybercrime.gov.in.
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert className="border-danger/30 bg-danger-muted text-danger-foreground">
      <ShieldAlert />
      <AlertTitle>Case {escalation.caseId} sent to CERT-Army</AlertTitle>
      <AlertDescription className="text-danger-foreground/90 space-y-3">
        <p>
          {escalation.emailed
            ? 'The full case was emailed to CERT-Army Incident Command.'
            : 'The case is in the CERT-Army case queue. The email will follow once delivery is available.'}
        </p>
        {countdown != null && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">
              Opening guidance in <span className="font-mono tabular">{countdown}</span> s.
            </span>
            <Button asChild size="sm">
              <Link to="/chat">Open Guidance Now</Link>
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onCancelCountdown}>
              Cancel
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

function EvidenceRow({ cid, cidLink }) {
  const [copied, setCopied] = useState(false)
  if (!cid) {
    return (
      <p className="text-muted-foreground text-sm">
        This evidence couldn’t be stored in the vault, so there’s no tamper-proof record for it.
      </p>
    )
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(cid)
      setCopied(true)
      toast.success('Evidence ID copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Couldn’t copy. Select the ID and copy it manually.')
    }
  }
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">
        Stored in the evidence vault and recorded on the blockchain ledger, so it can’t be changed later.
      </p>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <code className="bg-muted min-w-0 flex-1 rounded-md px-2 py-1.5 font-mono text-xs break-all" aria-label="Evidence ID">
          {cid}
        </code>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy ID'}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={cidLink} target="_blank" rel="noopener noreferrer">
              View Evidence
              <ExternalLink />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

/** The answer: risk score, what it is, what happens next, what to do, and the details behind it. */
export function ResultCard({ report, mitigationSource, escalation, countdown, onCancelCountdown, cid, cidLink, onUseChatTab }) {
  const score = report.final_risk_score
  const band = riskBand(score)
  const catId = report.category_id
  const known = catId != null && CATEGORY_HINTS[catId] != null
  // a "no threat" category that the shield raised to 40+ gets a new label from the engine; the benign hint would be wrong
  const hint = known && !(catId === 0 && score >= 40) ? CATEGORY_HINTS[catId] : null
  const heading = report.final_prediction || (known ? CATEGORY_LABELS[catId] : 'Result')
  const steps = Array.isArray(report.mitigation_steps) ? report.mitigation_steps : []
  const label = sourceLabel(mitigationSource, report.escalate_cert_army)

  return (
    <Card role="region" aria-labelledby="result-heading">
      <CardHeader className="gap-4">
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-sm">Result</p>
          <h2 id="result-heading" className="text-xl font-semibold break-words">
            {heading}
          </h2>
          {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
        </div>
        <RiskMeter score={score} />
        <p className="text-sm font-medium">{BAND_OUTCOME[band]}</p>
        <dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {report.final_confidence != null && (
            <div className="flex gap-1.5">
              <dt>Confidence</dt>
              <dd className="text-foreground font-mono tabular">{report.final_confidence}%</dd>
            </div>
          )}
          {report.threat_level && (
            <div className="flex gap-1.5">
              <dt>Threat level</dt>
              <dd className="text-foreground">{report.threat_level}</dd>
            </div>
          )}
        </dl>
      </CardHeader>

      <CardContent className="space-y-6">
        {report.analysed_as_conversation && (
          <Alert>
            <MessagesSquare />
            <AlertTitle>Checked as a conversation</AlertTitle>
            <AlertDescription>
              <p>
                This looks like a pasted chat, so it was checked as a whole conversation. For the best result, use Chat History
                and choose which participant you are.
              </p>
              {onUseChatTab && (
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onUseChatTab}>
                  Use Chat History
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <EscalationNotice escalation={escalation} countdown={countdown} onCancelCountdown={onCancelCountdown} />

        {steps.length > 0 && (
          <section aria-labelledby="steps-heading" className="space-y-3">
            <div className="space-y-1">
              <h3 id="steps-heading" className="text-sm font-semibold">
                What To Do Now
              </h3>
              {label && (
                <p className="text-muted-foreground flex items-center gap-2 text-sm" aria-live="polite">
                  {mitigationSource === 'loading' && <Spinner className="size-3.5" />}
                  {label}
                </p>
              )}
            </div>
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex min-w-0 gap-3 text-sm">
                  <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs tabular">
                    {i + 1}
                  </span>
                  <span className="min-w-0 pt-0.5 break-words">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {report.details && (
          <section aria-labelledby="why-heading" className="space-y-1.5">
            <h3 id="why-heading" className="text-sm font-semibold">
              Why
            </h3>
            <p className="text-muted-foreground text-sm break-words">{report.details}</p>
            {report.analysis_engine && (
              <p className="text-muted-foreground text-xs">Checked by: {report.analysis_engine}</p>
            )}
          </section>
        )}

        {report.counter_intel?.layers && (
          <>
            <Separator />
            <CounterIntelPanel report={report} />
          </>
        )}

        {report.counter_intel?.turns?.length > 0 && <ConversationTimeline report={report} />}

        <Separator />
        <section aria-labelledby="evidence-heading" className="space-y-2">
          <h3 id="evidence-heading" className="text-sm font-semibold">
            Evidence
          </h3>
          <EvidenceRow cid={cid} cidLink={cidLink} />
        </section>
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
        <Button asChild className="h-10">
          <Link to="/chat">
            Open Guidance
            <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-10">
          <Link to="/officialpage">CERT-Army View</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
