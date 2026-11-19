import { cn } from '@/lib/utils'
import { TONE_CHIP, scoreTone } from './tone'

const TIER_TONE = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' }

function sourceLabel(source = '') {
  if (source.startsWith('analyst:')) return 'Confirmed case'
  if (source.startsWith('curated:')) return 'Known threat message'
  const scenario = source.split(':')[1]
  return scenario ? `Reference chat · ${scenario.replaceAll('_', ' ')}` : 'Reference chat'
}

/**
 * Retrieval evidence for a chat-history check: the messages that looked like requests for
 * sensitive information, and the known cases they most resemble. Renders nothing otherwise.
 */
export function SimilarCases({ report }) {
  const rag = report?.counter_intel?.rag
  if (!rag) return null
  const flagged = rag.flagged_messages || []
  const vote = rag.conversation_vote || {}

  return (
    <section aria-labelledby="cases-heading" className="space-y-3">
      <div className="space-y-1">
        <h3 id="cases-heading" className="text-sm font-semibold">
          Similar Known Cases
        </h3>
        <p className="text-muted-foreground text-sm">
          {rag.n_flagged} of {rag.n_contact_messages} messages looked like a request for information. The most similar
          known chats were{' '}
          {['LOW', 'MEDIUM', 'HIGH'].map((k, i) => (
            <span key={k}>
              {i > 0 && ' / '}
              {k.toLowerCase()} risk <span className="font-mono tabular">{Math.round((vote[k] ?? 0) * 100)}%</span>
            </span>
          ))}
          .
        </p>
      </div>

      {flagged.length > 0 && (
        <ol className="divide-y rounded-lg border">
          {flagged.map((m) => {
            const pct = Math.round(m.p_si_request * 100)
            return (
              <li key={m.turn} className="space-y-2 px-3 py-2.5 text-sm">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      'inline-flex w-20 shrink-0 items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
                      TONE_CHIP[scoreTone(pct)],
                    )}
                    title="Share of similar known messages that asked for sensitive information"
                  >
                    <span className="font-mono tabular">{pct}%</span>
                  </span>
                  <p className="min-w-0 flex-1 break-words">{m.text}</p>
                </div>
                {m.similar_messages?.length > 0 && (
                  <ul className="text-muted-foreground ml-[5.75rem] space-y-1 text-xs">
                    {m.similar_messages.slice(0, 2).map((c, j) => (
                      <li key={j} className="break-words">
                        “{c.text}” <span className="whitespace-nowrap">· {sourceLabel(c.source)}</span>
                        {c.conversation_tier && (
                          <span className={cn('ml-1 rounded border px-1', TONE_CHIP[TIER_TONE[c.conversation_tier]])}>
                            {c.conversation_tier.toLowerCase()}
                          </span>
                        )}
                        <span className="font-mono tabular"> · {Math.round(c.similarity * 100)}% match</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
