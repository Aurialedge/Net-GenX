import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

/**
 * Form-level message under a form.
 * status: { tone: 'error' | 'success' | 'info', text } or null
 */
export function FormStatus({ status, className }) {
  if (!status?.text) return null
  const { tone, text } = status
  const Icon = tone === 'error' ? CircleAlert : tone === 'success' ? CircleCheck : Info
  return (
    <Alert
      variant={tone === 'error' ? 'destructive' : 'default'}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={cn(
        tone === 'success' && 'bg-success-muted text-success-foreground border-success/30',
        tone === 'info' && 'bg-muted',
        className,
      )}
    >
      <Icon aria-hidden />
      <AlertDescription className={cn('break-words', tone === 'success' && 'text-success-foreground', tone === 'error' && 'text-destructive')}>
        {text}
      </AlertDescription>
    </Alert>
  )
}
