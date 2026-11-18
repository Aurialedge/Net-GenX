import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

// The two one-click examples from the original page.
const EXAMPLES = [
  {
    label: 'Honeytrap',
    text: 'Hello handsome officer, saw you in uniform! Which regiment are you posted at in Leh? Can you share a picture of your bunker?',
  },
  {
    label: 'SPARSH Phishing',
    text: 'URGENT: Your SPARSH defence pension account has been locked. Verify Aadhaar and PAN immediately at http://sparsh-pension-defence-update.xyz to avoid pension suspension.',
  },
]

/** Single message: paste it, or try an example, then Check Message. */
export function MessageForm({ onSubmit, pending, busy }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const ref = useRef(null)

  function submit(e) {
    e.preventDefault()
    if (busy) return
    const text = message.trim()
    if (!text) {
      setError('Paste the message you want to check.')
      ref.current?.focus()
      return
    }
    setError('')
    onSubmit(text)
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field data-invalid={Boolean(error) || undefined}>
        <FieldLabel htmlFor="message">Message</FieldLabel>
        <Textarea
          id="message"
          ref={ref}
          rows={6}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            if (error) setError('')
          }}
          placeholder="Paste a WhatsApp message, SMS, email or link…"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby="message-help"
          className="max-h-80 min-h-32 break-words"
        />
        <FieldDescription id="message-help">
          English, Hinglish and Hindi are supported. Links, files and requests for passwords are checked in any language.
        </FieldDescription>
        <FieldError>{error}</FieldError>
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Try an example:</span>
        {EXAMPLES.map((ex) => (
          <Button
            key={ex.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setMessage(ex.text)
              setError('')
            }}
          >
            {ex.label}
          </Button>
        ))}
      </div>

      <Button type="submit" className="h-10 w-full sm:w-auto" disabled={busy}>
        {pending && <Spinner />}
        Check Message
      </Button>
    </form>
  )
}
