import { Link } from 'react-router-dom'
import { PageShell } from '@/components/app/page-shell'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <PageShell title="Page Not Found" width="narrow" className="flex items-center">
      <section className="w-full py-12 text-center sm:py-20">
        <p className="text-muted-foreground font-mono text-sm tabular">404</p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Page Not Found</h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md">
          This page doesn’t exist or has moved. Check the address, or go back to the home page.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/">Go Home</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/upload">Check a Message</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  )
}
