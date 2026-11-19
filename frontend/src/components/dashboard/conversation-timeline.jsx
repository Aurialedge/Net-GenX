import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { TONE_CHIP, humanise, scoreTone } from './tone'

// Kill-chain stages reported per contact message by the AI engine (index = stage number).
const STAGES = ['Contact', 'Rapport', 'Trust / isolation', 'Elicitation', 'Exploitation']
const TONE_WORD = { low: 'Low', medium: 'Medium', high: 'High' }

/** Per-message risk for a chat-history check. Renders nothing for single messages. */
export function ConversationTimeline({ report }) {
  const turns = report?.counter_intel?.turns
  if (!Array.isArray(turns) || turns.length === 0) return null
  const trajectory = (report.counter_intel.layers || []).find((l) => l.layer === 5)

  return (
    <section aria-labelledby="timeline-heading" className="space-y-3">
      <div className="space-y-1">
        <h3 id="timeline-heading" className="text-sm font-semibold">
          How the Conversation Developed
        </h3>
        <p className="text-muted-foreground text-sm">
          {turns.length} {turns.length === 1 ? 'message' : 'messages'} from the other person, oldest first.
        </p>
        {trajectory && (
          <p className="text-muted-foreground text-sm">
            Overall pattern: <span className="text-foreground font-medium">{humanise(trajectory.verdict)}</span>{' '}
            (<span className="font-mono tabular">{Math.round(trajectory.score ?? 0)}/100</span>)
            {trajectory.signals?.length > 0 && <> · {trajectory.signals.map((s) => String(s).replaceAll('_', ' ')).join(' · ')}</>}
          </p>
        )}
      </div>

      <ScrollArea className="h-72 rounded-lg border">
        <ol className="divide-y">
          {turns.map((t, i) => {
            const tone = scoreTone(t.level1_risk)
            return (
              <li key={i} className="flex min-w-0 items-start gap-3 px-3 py-2.5 text-sm">
                <span
                  className={cn(
                    'inline-flex w-20 shrink-0 items-center justify-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium',
                    TONE_CHIP[tone],
                  )}
                >
                  <span className="font-mono tabular">{t.level1_risk}</span>
                  <span>{TONE_WORD[tone]}</span>
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-muted-foreground text-xs">{STAGES[t.stage] ?? t.stage}</p>
                  <p className="break-words">{t.text}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </ScrollArea>
    </section>
  )
}
