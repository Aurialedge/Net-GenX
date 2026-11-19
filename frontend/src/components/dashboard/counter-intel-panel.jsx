import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TONE_BAR, TONE_CHIP, humanise } from './tone'

// Overall shield verdict -> tone (unknown verdicts read as "clear", like the old panel).
const VERDICT_TONE = { HOSTILE: 'high', HIGH_RISK: 'high', SUSPICIOUS: 'medium', CLEAR: 'low' }

// Per-layer bars used a 70 / 40 split in the original panel.
const layerTone = (score) => (score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low')

/** The five independent checks behind a result ("counter-intel shield"). Renders nothing without data. */
export function CounterIntelPanel({ report }) {
  const ci = report?.counter_intel
  if (!ci || !Array.isArray(ci.layers)) return null
  const verdictTone = VERDICT_TONE[ci.verdict] || 'low'

  return (
    <section aria-labelledby="ci-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ci-heading" className="text-sm font-semibold">
          Five-Layer Check
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {ci.humanised_ai_bot_suspected && (
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', TONE_CHIP.medium)}>
              <Bot className="size-3.5" aria-hidden />
              Likely an AI bot posing as a person
            </span>
          )}
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', TONE_CHIP[verdictTone])}>
            {humanise(ci.verdict) || 'Clear'}
            <span className="font-mono tabular">{Math.round(ci.counter_intel_score ?? 0)}/100</span>
          </span>
        </div>
      </div>

      <ol className="grid gap-2">
        {ci.layers.map((layer) => {
          const ok = layer.status === 'ok'
          const score = Math.round(layer.score ?? 0)
          return (
            <li key={layer.layer} className="bg-muted/40 rounded-lg border p-3">
              <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 font-medium break-words">
                  <span className="text-muted-foreground font-mono tabular">{layer.layer}.</span> {layer.name}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {ok ? (
                    <>
                      {humanise(layer.verdict)} · <span className="font-mono tabular">{score}/100</span>
                    </>
                  ) : (
                    'Unavailable'
                  )}
                </span>
              </div>
              <div
                className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full"
                role="meter"
                aria-label={`${layer.name} score`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={score}
              >
                <div
                  className={cn('h-full rounded-full', ok ? TONE_BAR[layerTone(score)] : 'bg-muted-foreground/30')}
                  style={{ width: `${Math.max(2, score)}%` }}
                />
              </div>
              {layer.signals?.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Signals">
                  {layer.signals.slice(0, 4).map((s) => (
                    <li key={s} className="bg-background text-muted-foreground rounded-md border px-1.5 py-0.5 text-xs break-words">
                      {String(s).replaceAll('_', ' ')}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>

      {ci.primary_intent && ci.primary_intent !== 'benign_social' && (
        <p className="text-muted-foreground text-sm">
          Likely intent: <span className="text-foreground font-medium">{humanise(ci.primary_intent)}</span>
        </p>
      )}
    </section>
  )
}
