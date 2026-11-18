import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-6', className)}>
      <rect width="32" height="32" rx="7" className="fill-foreground" />
      <path
        d="M16 6.5 9 9.2v6.1c0 4.6 3 8.4 7 10.2 4-1.8 7-5.6 7-10.2V9.2z"
        fill="none"
        strokeWidth="2"
        strokeLinejoin="round"
        className="stroke-background"
      />
    </svg>
  )
}

export function Logo({ to = '/', className }) {
  return (
    <Link
      to={to}
      className={cn('flex items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', className)}
    >
      <LogoMark />
      <span>NetGenX</span>
    </Link>
  )
}
