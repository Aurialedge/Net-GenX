import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RiskBadge } from '@/components/app/risk-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

const EXCERPT_LENGTH = 220

/** The case the guidance is about, read from the last analysis saved in localStorage ("record"). */
export function CaseSummary({ record }) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()

  const score = Number(record.final_risk_score)
  const hasScore = record.final_risk_score != null && Number.isFinite(score)
  const escalated = Boolean(record.escalate_cert_army)
  const message = (record.reported_message || '').trim()
  const details = typeof record.details === 'string' ? record.details.trim() : ''
  const isLong = message.length > EXCERPT_LENGTH || Boolean(details)
  const excerpt = !open && message.length > EXCERPT_LENGTH ? `${message.slice(0, EXCERPT_LENGTH).trimEnd()}…` : message

  return (
    <Card>
      <CardHeader>
        <CardDescription>Your last case</CardDescription>
        <CardTitle className="text-lg break-words">{record.final_prediction}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          {hasScore && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Risk</dt>
              <dd className="flex items-center gap-2">
                <RiskBadge score={score} />
                <span className="text-muted-foreground font-mono tabular">{Math.round(score)}/100</span>
              </dd>
            </div>
          )}
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">CERT-Army</dt>
            <dd className="font-medium">{escalated ? 'Case handed over' : 'Not escalated'}</dd>
          </div>
          {record.threat_level && (
            <div className="flex items-center gap-2">
              <dt className="text-muted-foreground">Threat level</dt>
              <dd className="font-medium break-words">{record.threat_level}</dd>
            </div>
          )}
        </dl>

        {message && (
          <figure className="bg-muted/50 rounded-md border p-3">
            <figcaption className="text-muted-foreground mb-1.5 text-xs">What you reported</figcaption>
            <blockquote className="text-sm leading-relaxed break-words whitespace-pre-wrap">{excerpt}</blockquote>
          </figure>
        )}

        {open && details && (
          <div id={detailsId} className="space-y-1.5">
            <h3 className="text-sm font-medium">Why it was flagged</h3>
            <p className="text-muted-foreground text-sm leading-relaxed break-words">{details}</p>
          </div>
        )}

        {isLong && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            aria-expanded={open}
            aria-controls={open && details ? detailsId : undefined}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
            {open ? 'Show Less' : 'Show Full Case'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/** Shown when there is no saved analysis yet. Questions can still be asked below. */
export function NoCase() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>No Case to Discuss Yet</EmptyTitle>
        <EmptyDescription>
          Check a message first and the assistant will explain what to do about it. You can still ask a general question
          below.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/upload">Check a Message</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
