import { LogOut, Menu } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from '@/components/app/logo'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { api } from '@/lib/api'
import { userStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const DEFAULT_LINKS = [
  { to: '/upload', label: 'Report' },
  { to: '/chat', label: 'Guidance' },
  { to: '/workflow', label: 'How It Works' },
]

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/**
 * Top bar shared by every page.
 * links: [{ to, label }]   actions: extra right-side nodes (e.g. a primary button)
 */
export function SiteHeader({ links = DEFAULT_LINKS, actions, showAccount = true }) {
  const { user, clearUser } = userStore()
  const navigate = useNavigate()
  const signedIn = Boolean(user?.name || user?.email)

  async function signOut() {
    await api.logout()
    clearUser()
    localStorage.clear()
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    cn(
      'rounded-md px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
    )

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {actions}
          <ThemeToggle />
          {showAccount && signedIn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">{initials(user.name || user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="truncate text-sm font-medium">{user.name || 'Signed in'}</div>
                  {user.email && <div className="text-muted-foreground truncate text-xs">{user.email}</div>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
                {links.map((l) => (
                  <NavLink key={l.to} to={l.to} className={linkClass}>
                    {l.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
