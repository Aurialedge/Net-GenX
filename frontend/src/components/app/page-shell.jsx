import { SiteFooter } from '@/components/app/site-footer'
import { SiteHeader } from '@/components/app/site-header'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/utils'

/** Header + main + footer. `width` controls the content column. */
export function PageShell({ title, header, children, footer = true, width = 'default', className }) {
  useDocumentTitle(title)
  const max = { narrow: 'max-w-2xl', default: 'max-w-6xl', wide: 'max-w-7xl' }[width]
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="bg-background sr-only z-50 rounded-md border px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      {header ?? <SiteHeader />}
      <main id="main" className={cn('mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12', max, className)}>
        {children}
      </main>
      {footer && <SiteFooter />}
    </div>
  )
}

/** Page title block: h1 + optional description + optional right-aligned actions. */
export function PageHeading({ title, description, actions, className }) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}
