import { cn } from '@/lib/utils'
import { BAND_LABELS, riskBand } from '@/lib/risk'

const tone = {
  low: 'border-success/30 bg-success-muted text-success-foreground',
  medium: 'border-warning/40 bg-warning-muted text-warning-foreground',
  high: 'border-danger/30 bg-danger-muted text-danger-foreground',
}
const dot = { low: 'bg-success', medium: 'bg-warning', high: 'bg-danger' }

/** Risk level as text + colour (never colour alone). */
export function RiskBadge({ score, className }) {
  const band = riskBand(score)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tone[band],
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', dot[band])} />
      {BAND_LABELS[band]}
    </span>
  )
}

/** Score out of 100 with a thin bar; the threshold tick marks where CERT-Army takes over. */
export function RiskMeter({ score, className }) {
  const band = riskBand(score)
  const value = Math.max(0, Math.min(100, Math.round(score)))
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-3xl font-semibold tabular">
          {value}
          <span className="text-muted-foreground text-base font-normal">/100</span>
        </span>
        <RiskBadge score={value} />
      </div>
      <div
        className="bg-muted relative mt-3 h-1.5 w-full overflow-hidden rounded-full"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Risk score"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', dot[band])}
          style={{ width: `${value}%` }}
        />
        <span aria-hidden className="bg-foreground/40 absolute top-0 left-[80%] h-full w-px" />
      </div>
      <div className="text-muted-foreground relative mt-1.5 h-4 text-xs tabular">
        <span className="absolute left-0">0</span>
        <span className="absolute left-[80%] -translate-x-1/2 whitespace-nowrap">80 · CERT-Army</span>
        <span className="absolute right-0 hidden sm:inline">100</span>
      </div>
    </div>
  )
}
