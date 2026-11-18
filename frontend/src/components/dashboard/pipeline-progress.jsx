import { Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const STEPS = [
  'Create a fingerprint of the evidence',
  'Store the evidence in the vault',
  'Check it with the AI engine',
  'Record it on the ledger',
  'Done',
]

/** Calm step list for the 5-step check: fingerprint, vault, AI, ledger, done. */
export function PipelineProgress({ step, stage }) {
  const value = Math.round((Math.max(0, step - 1) / (STEPS.length - 1)) * 100)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Checking…</CardTitle>
        <CardDescription aria-live="polite">{stage || 'Working on it…'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={value} aria-label="Progress" />
        <ol className="space-y-2.5 text-sm">
          {STEPS.map((label, i) => {
            const n = i + 1
            const done = step > n || (n === STEPS.length && step === n)
            const current = step === n && !done
            return (
              <li key={label} className="flex items-center gap-3" aria-current={current ? 'step' : undefined}>
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-mono tabular',
                    done && 'bg-primary text-primary-foreground border-primary',
                    current && 'border-foreground',
                    !done && !current && 'text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-3.5" aria-hidden /> : current ? <Spinner className="size-3.5" /> : n}
                </span>
                <span className={cn(done || current ? 'text-foreground' : 'text-muted-foreground', current && 'font-medium')}>
                  {label}
                  {done && <span className="sr-only"> (done)</span>}
                </span>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
