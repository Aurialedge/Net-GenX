import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, FileSearch, LogOut, RefreshCw, Search } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeading, PageShell } from '@/components/app/page-shell'
import { SiteHeader } from '@/components/app/site-header'
import { CaseRow } from '@/components/official/case-row'
import { FILTERS, getRiskScore, parseNote } from '@/components/official/cases'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api } from '@/lib/api'

const HEADER_LINKS = [
  { to: '/officialpage', label: 'Cases' },
  { to: '/upload', label: 'Report' },
  { to: '/workflow', label: 'How It Works' },
]

function SkeletonRows() {
  return Array.from({ length: 5 }, (_, i) => (
    <TableRow key={i} className="hover:bg-transparent">
      <TableCell>
        <Skeleton className="h-5 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-36" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="ml-auto h-7 w-52" />
      </TableCell>
    </TableRow>
  ))
}

export default function Official() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const filter = FILTERS.some((f) => f.value === params.get('risk')) ? params.get('risk') : 'all'
  const searchQuery = params.get('q') ?? ''

  const [cids, setCids] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [textContents, setTextContents] = useState({}) // cid -> { value?, loading?, error? }
  const [expanded, setExpanded] = useState({})
  const [copiedMap, setCopiedMap] = useState({})
  const [signingOut, setSigningOut] = useState(false)
  const inFlight = useRef(new Set())

  const getcidsfromblock = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { ok, status, data } = await api.getCids()
      if (!ok) throw new Error(`HTTP error! Status: ${status}`)
      const sorted = [...(data?.cids || [])].sort((a, b) => getRiskScore(b.note) - getRiskScore(a.note))
      setCids(sorted)
    } catch (err) {
      console.error('Error fetching CIDs:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getcidsfromblock()
  }, [getcidsfromblock])

  function setParam(key, value) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value && value !== 'all') next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  async function loadText(cid, force = false) {
    if (inFlight.current.has(cid)) return
    if (!force && textContents[cid]?.value !== undefined) return // cached
    inFlight.current.add(cid)
    setTextContents((prev) => ({ ...prev, [cid]: { loading: true } }))
    try {
      const value = await api.getEvidenceText(cid)
      setTextContents((prev) => ({ ...prev, [cid]: { value } }))
    } catch (err) {
      console.error('Error fetching text:', err)
      setTextContents((prev) => ({ ...prev, [cid]: { error: true } }))
    } finally {
      inFlight.current.delete(cid)
    }
  }

  async function handleCopy(cid) {
    try {
      await navigator.clipboard.writeText(cid)
      toast.success('CID copied')
      setCopiedMap((prev) => ({ ...prev, [cid]: true }))
      setTimeout(() => setCopiedMap((prev) => ({ ...prev, [cid]: false })), 2000)
    } catch {
      toast.error('Couldn’t copy the CID. Select it in the expanded row and copy it manually.')
    }
  }

  async function handleLogout() {
    if (signingOut) return
    setSigningOut(true)
    await api.logout()
    localStorage.clear()
    navigate('/auth')
  }

  const rows = useMemo(() => cids.map((item) => ({ item, parsed: parseNote(item.note) })), [cids])

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((f) => [f.value, 0]))
    for (const { parsed } of rows) for (const f of FILTERS) if (f.test(parsed.score)) c[f.value] += 1
    return c
  }, [rows])

  const activeFilter = FILTERS.find((f) => f.value === filter)
  const q = searchQuery.trim().toLowerCase()
  const visible = rows.filter(({ item, parsed }) => {
    if (!activeFilter.test(parsed.score)) return false
    if (!q) return true
    return (
      item.cid?.toLowerCase().includes(q) ||
      (item.note && item.note.toLowerCase().includes(q)) ||
      (typeof textContents[item.cid]?.value === 'string' && textContents[item.cid].value.toLowerCase().includes(q))
    )
  })

  const filtering = filter !== 'all' || Boolean(q)
  const showSkeleton = loading && cids.length === 0

  return (
    <PageShell title="Case Records" header={<SiteHeader links={HEADER_LINKS} />}>
      <PageHeading
        title="Case Records"
        description="Every case stored in the evidence vault and recorded on the ledger, highest risk first."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/upload">Report a Message</Link>
            </Button>
            <Button variant="ghost" onClick={handleLogout} aria-disabled={signingOut || undefined}>
              {signingOut ? <Spinner aria-hidden="true" role="presentation" /> : <LogOut aria-hidden />}
              Sign Out
            </Button>
          </>
        }
      />

      <section aria-label="Summary" className="mb-6">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {FILTERS.map((f) => (
            <Card key={f.value} className="gap-1 px-4 py-4">
              <dt className="text-muted-foreground text-sm">
                {f.value === 'all' ? 'Total cases' : f.label}
                {f.range && <span className="tabular"> · {f.range}</span>}
              </dt>
              <dd className="text-2xl font-semibold tabular">
                {showSkeleton ? <Skeleton className="mt-1 h-7 w-10" /> : counts[f.value]}
              </dd>
            </Card>
          ))}
        </dl>
      </section>

      <section aria-label="Cases" className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <Field className="md:max-w-sm">
            <FieldLabel htmlFor="case-search">Search</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                id="case-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder="CID, category or loaded text…"
                spellCheck={false}
                autoComplete="off"
              />
            </InputGroup>
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label id="risk-filter-label">Risk</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={filter}
                onValueChange={(v) => setParam('risk', v || 'all')}
                aria-labelledby="risk-filter-label"
              >
                {FILTERS.map((f) => (
                  <ToggleGroupItem key={f.value} value={f.value} className="gap-1.5 px-2.5">
                    {f.label}
                    <span className="text-muted-foreground tabular">{counts[f.value]}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <Button variant="outline" onClick={getcidsfromblock} aria-disabled={loading || undefined} disabled={loading}>
              {loading ? <Spinner aria-hidden="true" role="presentation" /> : <RefreshCw aria-hidden />}
              Refresh
            </Button>
          </div>
        </div>

        {error && !loading ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Couldn’t load case records</AlertTitle>
            <AlertDescription>
              <p>Check that the ledger service is running on port 9000, then try again.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={getcidsfromblock}>
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        ) : !loading && visible.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileSearch />
              </EmptyMedia>
              <EmptyTitle>{filtering ? 'No Matching Cases' : 'No Cases Yet'}</EmptyTitle>
              <EmptyDescription>
                {filtering
                  ? 'No case matches this search or risk level. Text search only covers evidence you’ve opened.'
                  : 'Cases appear here once personnel report a message and it is recorded on the ledger.'}
              </EmptyDescription>
            </EmptyHeader>
            {filtering && (
              <EmptyContent>
                <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                  Clear Filters
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="bg-card rounded-xl border">
            <Table>
              <TableCaption className="sr-only">
                Case records, sorted by risk score, highest first. {visible.length} shown.
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Risk</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead className="hidden lg:table-cell">Recorded</TableHead>
                  <TableHead className="pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4">
                {showSkeleton ? (
                  <SkeletonRows />
                ) : (
                  visible.map(({ item, parsed }, i) => (
                    <CaseRow
                      key={`${item.cid}-${i}`}
                      item={item}
                      parsed={parsed}
                      expanded={Boolean(expanded[item.cid])}
                      onToggle={(cid) => setExpanded((prev) => ({ ...prev, [cid]: !prev[cid] }))}
                      text={textContents[item.cid]}
                      onLoadText={loadText}
                      copied={Boolean(copiedMap[item.cid])}
                      onCopy={handleCopy}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </PageShell>
  )
}
