import { useRef, useState } from 'react'
import { CircleAlert, Upload } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { userStore } from '@/lib/store'
import { describeError } from './tone'

const MAX_BYTES = 5 * 1024 * 1024
const NOT_IN_CHAT = '__not_in_chat__'

const PLACEHOLDER =
  '12/11/26, 9:02 pm - Priya: Hi! I saw your profile in the group\n12/11/26, 9:10 pm - Rahul: Hi, who is this?\n…\n\nOne message per line as “Name: message” also works.'

/**
 * Chat history: upload an export or paste it, Read Chat to list the participants,
 * pick yourself, then Analyze Conversation. `onAnalyze` resolves to an error string or null.
 */
export function ChatHistoryForm({ onAnalyze, pending, busy }) {
  const [chatText, setChatText] = useState('')
  const [chatFileName, setChatFileName] = useState('')
  const [chatParsed, setChatParsed] = useState(null) // { senders, messages, format, truncated, suggested_me, speakers_inferred }
  const [chatMe, setChatMe] = useState('')
  const [chatError, setChatError] = useState('')
  const [inputError, setInputError] = useState('')
  const [reading, setReading] = useState(false)
  const textRef = useRef(null)
  const fileRef = useRef(null)

  async function loadChatFile(f) {
    if (!f) return
    if (f.size > MAX_BYTES) {
      setChatError('This chat export is larger than 5 MB. Export it without media, or paste the most recent part instead.')
      return
    }
    setChatText(await f.text())
    setChatFileName(f.name)
    setChatParsed(null)
    setChatError('')
    setInputError('')
  }

  // Step 1: parse the export and list the participants so the reporter can pick themselves
  async function readChat(e) {
    e.preventDefault()
    if (reading || busy) return
    setChatError('')
    if (!chatText.trim()) {
      setInputError('Upload a chat export or paste the conversation first.')
      textRef.current?.focus()
      return
    }
    setInputError('')
    setReading(true)
    try {
      const { status, data } = await api.parseTranscript(chatText)
      if (!data?.status) throw new Error(data?.error || `The AI engine returned HTTP ${status}.`)
      setChatParsed(data)
      const { user } = userStore.getState()
      const mine = [user?.name, user?.email?.split('@')[0]].filter(Boolean).map((s) => s.toLowerCase())
      const guess = data.senders.find((s) =>
        mine.some((m) => s.name.toLowerCase().includes(m) || m.includes(s.name.toLowerCase())),
      )
      setChatMe(data.suggested_me || (guess ? guess.name : ''))
    } catch (err) {
      setChatParsed(null)
      setChatError(`Couldn’t read this chat. ${describeError(err)}`)
    } finally {
      setReading(false)
    }
  }

  // Step 2: handled by the page (vault + five-layer analysis)
  async function analyze() {
    if (!chatParsed || busy) return
    setChatError('')
    const err = await onAnalyze({ chatText, me: chatMe, parsed: chatParsed, fileName: chatFileName })
    if (err) setChatError(err)
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Honeytraps build up slowly, so each message can look harmless on its own. Upload the whole conversation to see how it
        progresses and whether the other person keeps asking after you say no. In WhatsApp: open the chat, tap ⋮ › More ›
        Export chat › Without media.
      </p>

      <form onSubmit={readChat} className="space-y-4" noValidate>
        <Field>
          <span className="text-sm font-medium" id="chat-file-label">
            Chat export
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              id="chat-file"
              type="file"
              accept=".txt,.json,.csv,text/plain,application/json,text/csv"
              className="sr-only"
              aria-labelledby="chat-file-label"
              onChange={(e) => {
                loadChatFile(e.target.files?.[0])
                e.target.value = ''
              }}
              tabIndex={-1}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} aria-describedby="chat-file-help">
              <Upload />
              Upload Chat Export…
            </Button>
            {chatFileName && (
              <span className="text-muted-foreground min-w-0 truncate text-sm" title={chatFileName}>
                {chatFileName}
              </span>
            )}
          </div>
          <FieldDescription id="chat-file-help">
            WhatsApp (Android or iPhone) .txt, Telegram .json or .csv, up to 5 MB. Or paste the conversation below.
          </FieldDescription>
        </Field>

        <Field data-invalid={Boolean(inputError) || undefined}>
          <FieldLabel htmlFor="chat-text">Conversation</FieldLabel>
          <Textarea
            id="chat-text"
            ref={textRef}
            rows={8}
            value={chatText}
            onChange={(e) => {
              setChatText(e.target.value)
              setChatParsed(null)
              setChatFileName('')
              if (inputError) setInputError('')
            }}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            aria-invalid={Boolean(inputError) || undefined}
            className="max-h-96 min-h-40 font-mono text-xs break-words md:text-xs"
          />
          <FieldError>{inputError}</FieldError>
        </Field>

        <Button type="submit" variant={chatParsed ? 'outline' : 'default'} className="h-10 w-full sm:w-auto" disabled={busy}>
          {reading && <Spinner />}
          Read Chat
        </Button>
      </form>

      {chatParsed && (
        <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
          <p className="text-sm">
            Read <span className="font-mono tabular">{chatParsed.messages.length}</span>{' '}
            {chatParsed.messages.length === 1 ? 'message' : 'messages'} ({chatParsed.format})
            {chatParsed.truncated > 0 && (
              <>
                . Only the most recent <span className="font-mono tabular">{chatParsed.messages.length}</span> are checked;{' '}
                <span className="font-mono tabular">{chatParsed.truncated}</span> older ones were skipped
              </>
            )}
            .
          </p>

          {chatParsed.speakers_inferred && (
            <Alert>
              <CircleAlert />
              <AlertTitle>No sender names found</AlertTitle>
              <AlertDescription>
                We assumed the messages alternate between two people, starting with Person 1. Choose which one is you, or
                “Not in this chat”.
              </AlertDescription>
            </Alert>
          )}

          <FieldSet>
            <FieldLegend variant="label">Which participant are you?</FieldLegend>
            <FieldDescription>Your own messages are used as context (for example, when you refuse) but aren’t scored as threats.</FieldDescription>
            <RadioGroup
              value={chatMe === '' ? NOT_IN_CHAT : chatMe}
              onValueChange={(v) => setChatMe(v === NOT_IN_CHAT ? '' : v)}
              className="gap-1"
            >
              {chatParsed.senders.map((s, i) => (
                <div key={s.name} className="flex min-w-0 items-center gap-3 rounded-md px-1 py-1.5">
                  <RadioGroupItem value={s.name} id={`sender-${i}`} />
                  <Label htmlFor={`sender-${i}`} className="min-w-0 font-normal">
                    <span className="truncate" title={s.name}>
                      {s.name}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs tabular">
                      {s.count} {s.count === 1 ? 'message' : 'messages'}
                    </span>
                  </Label>
                </div>
              ))}
              <div className="flex items-center gap-3 rounded-md px-1 py-1.5">
                <RadioGroupItem value={NOT_IN_CHAT} id="sender-none" />
                <Label htmlFor="sender-none" className="font-normal">
                  Not in this chat
                </Label>
              </div>
            </RadioGroup>
          </FieldSet>

          <Button type="button" className="h-10 w-full sm:w-auto" onClick={analyze} disabled={busy}>
            {pending && <Spinner />}
            Analyze Conversation
          </Button>
        </div>
      )}

      {chatError && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Chat check failed</AlertTitle>
          <AlertDescription>{chatError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
