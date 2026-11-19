import { Check, ChevronDown, Copy, ExternalLink } from 'lucide-react'
import { RiskBadge } from '@/components/app/risk-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'
import { evidenceUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { TYPE_LABELS, formatScore, toDate } from '@/components/official/cases'

const COLUMNS = 6

function shortCid(cid) {
  return cid.length > 18 ? `${cid.slice(0, 8)}…${cid.slice(-6)}` : cid
}

function formatDate(date) {
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function EvidencePreview({ cid, type, text, onRetry }) {
  const local = evidenceUrl(cid)
  const pub = `https://ipfs.io/ipfs/${cid}`

  if (type === 'file' || type === 'image') {
    return (
      <img
        src={local}
        alt="Evidence file"
        className="bg-muted max-h-80 max-w-full rounded-md border object-contain"
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = pub
        }}
      />
    )
  }
  if (type === 'audio') {
    return (
      <audio controls className="w-full max-w-lg">
        <source src={local} />
        <source src={pub} />
      </audio>
    )
  }
  if (type === 'video') {
    return (
      <video controls className="bg-muted aspect-video w-full max-w-2xl rounded-md border">
        <source src={local} />
        <source src={pub} />
      </video>
    )
  }

  if (text?.loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading evidence text">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    )
  }
  if (text?.error) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p className="text-danger-foreground">Couldn’t load the text from IPFS. Check the gateway, then try again.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    )
  }
  if (text?.value === undefined) return null
  return (
    <pre
      tabIndex={0}
      aria-label="Evidence text"
      className="bg-muted max-h-80 overflow-auto rounded-md border p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap"
    >
      {text.value || 'This record is empty.'}
    </pre>
  )
}

/** One ledger record: summary row plus an optional expanded evidence row. */
export function CaseRow({ item, parsed, expanded, onToggle, text, onLoadText, copied, onCopy }) {
  const { score, category, type } = parsed
  const date = toDate(item.timestamp)
  const panelId = `evidence-${item.cid}`
  const isText = type === 'message' || type === 'chat_history'
  const toggleLabel = isText ? (expanded ? 'Hide Text' : 'Show Text') : expanded ? 'Hide Preview' : 'Preview'

  return (
    <>
      <TableRow data-state={expanded ? 'selected' : undefined}>
        <TableCell>
          <div className="flex items-center gap-2">
            <RiskBadge score={score} />
            <span className="font-mono text-sm tabular">{formatScore(score)}</span>
          </div>
        </TableCell>
        <TableCell className="max-w-[16rem]">
          <span className="block truncate font-medium" title={category}>
            {category}
          </span>
        </TableCell>
        <TableCell className="text-muted-foreground hidden md:table-cell">{TYPE_LABELS[type]}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs" title={item.cid}>
              {shortCid(item.cid)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={copied ? 'CID copied' : 'Copy CID'}
              onClick={() => onCopy(item.cid)}
            >
              {copied ? <Check className="text-success-foreground" /> : <Copy />}
            </Button>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground hidden text-xs tabular lg:table-cell">
          {date ? <time dateTime={date.toISOString()}>{formatDate(date)}</time> : <span aria-label="Unknown">—</span>}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1.5">
            <Button asChild variant="ghost" size="sm">
              <a href={evidenceUrl(item.cid)} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden />
                View Evidence
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-w-24"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => {
                if (!expanded && isText) onLoadText(item.cid)
                onToggle(item.cid)
              }}
            >
              <ChevronDown aria-hidden className={cn('transition-transform', expanded && 'rotate-180')} />
              {toggleLabel}
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell id={panelId} colSpan={COLUMNS} className="bg-muted/30 p-4 whitespace-normal">
            <div className="max-w-[calc(100vw-4rem)] space-y-4 sm:max-w-none">
              <EvidencePreview cid={item.cid} type={type} text={text} onRetry={() => onLoadText(item.cid, true)} />
              <dl className="text-muted-foreground grid gap-x-6 gap-y-2 text-xs sm:grid-cols-[auto_1fr]">
                <dt>CID</dt>
                <dd className="text-foreground font-mono break-all">{item.cid}</dd>
                <dt className="md:hidden">Type</dt>
                <dd className="text-foreground md:hidden">{TYPE_LABELS[type]}</dd>
                {date && (
                  <>
                    <dt className="lg:hidden">Recorded</dt>
                    <dd className="text-foreground tabular lg:hidden">
                      <time dateTime={date.toISOString()}>{formatDate(date)}</time>
                    </dd>
                  </>
                )}
                {item.blockNumber != null && item.blockNumber !== '' && (
                  <>
                    <dt>Block</dt>
                    <dd className="text-foreground font-mono tabular">#{item.blockNumber}</dd>
                  </>
                )}
              </dl>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
