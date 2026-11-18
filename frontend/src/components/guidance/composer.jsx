import { useId } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Kbd } from '@/components/ui/kbd'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

const SUGGESTIONS = [
  'I already shared my OTP. What now?',
  'How do I report this to my unit?',
  'Should I block the contact?',
]

/** Follow-up question form. Enter sends, Shift+Enter adds a new line. */
export function Composer({ value, onChange, onSend, pending, inputRef }) {
  const id = useId()

  function submit(e) {
    e.preventDefault()
    if (pending) return
    onSend(value)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (!pending) onSend(value)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" aria-label="Suggested questions" role="group">
        {SUGGESTIONS.map((s) => (
          <Button
            key={s}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-8 rounded-full px-3 py-1 text-left whitespace-normal"
            disabled={pending}
            onClick={() => onSend(s)}
          >
            {s}
          </Button>
        ))}
      </div>
      <form onSubmit={submit} className="bg-card rounded-xl border p-3 shadow-xs">
        <Field>
          <FieldLabel htmlFor={id}>Ask a follow-up question</FieldLabel>
          <Textarea
            id={id}
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={2000}
            placeholder="What should I do if they message me again…"
            className="max-h-48 resize-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FieldDescription className="text-xs">
              <Kbd>Enter</Kbd> to send, <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for a new line
            </FieldDescription>
            <Button type="submit" aria-disabled={pending || undefined} className="min-w-20">
              {pending ? <Spinner aria-hidden="true" role="presentation" /> : <ArrowUp aria-hidden />}
              Send
            </Button>
          </div>
        </Field>
      </form>
    </div>
  )
}
