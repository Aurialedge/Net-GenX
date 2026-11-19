import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/app/logo'

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span>NetGenX · Built for Indian defence personnel</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link className="hover:text-foreground" to="/workflow">
            How It Works
          </Link>
          <Link className="hover:text-foreground" to="/auth">
            Sign In
          </Link>
          <a className="hover:text-foreground" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
            cybercrime.gov.in
          </a>
          <span>
            Helpline <span className="tabular text-foreground">1930</span>
          </span>
        </nav>
      </div>
    </footer>
  )
}
