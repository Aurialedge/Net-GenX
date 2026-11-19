import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DEMO_OFFICIAL, DEMO_PERSONNEL } from '@/components/auth/helpers'


function Row({ term, children }) {
  return (
    <div className="flex min-w-0 justify-between gap-3">
      <dt className="text-muted-foreground shrink-0">{term}</dt>
      <dd className="min-w-0 truncate font-mono" title={typeof children === 'string' ? children : undefined}>
        {children}
      </dd>
    </div>
  )
}

/** Collapsible list of the demo accounts, with buttons that fill in the matching form. */
export function DemoAccounts({ onUsePersonnel, onUseOfficial }) {
  return (
    <details className="group bg-card rounded-xl border text-sm">
      <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-4 outline-none select-none focus-visible:ring-[3px] [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
        Demo accounts
      </summary>
      <div className="grid gap-4 border-t px-4 py-4">
        <section aria-labelledby="demo-personnel" className="grid gap-2">
          <h2 id="demo-personnel" className="font-medium">
            Personnel
          </h2>
          <dl className="grid gap-1">
            <Row term="Email">{DEMO_PERSONNEL.email}</Row>
            <Row term="Password">{DEMO_PERSONNEL.password}</Row>
          </dl>
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onUsePersonnel}>
            Fill In Personnel Account
          </Button>
        </section>
        <section aria-labelledby="demo-official" className="grid gap-2">
          <h2 id="demo-official" className="font-medium">
            CERT-Army official
          </h2>
          <dl className="grid gap-1">
            <Row term="Official ID">{DEMO_OFFICIAL.officialId}</Row>
            <Row term="Department">{DEMO_OFFICIAL.department}</Row>
            <Row term="Password">{DEMO_OFFICIAL.password}</Row>
            <Row term="Verification code">{DEMO_OFFICIAL.code}</Row>
          </dl>
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onUseOfficial}>
            Fill In Official Account
          </Button>
        </section>
      </div>
    </details>
  )
}
