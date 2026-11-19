import { useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

// Payload category sent along as the record's input type (same values as before).
const FILE_TYPES = [
  { value: 'file', label: 'Suspicious file or app (.apk, .docx)' },
  { value: 'image', label: 'Screenshot or image (.png, .jpg)' },
  { value: 'audio', label: 'Voice note or audio (.wav, .mp3)' },
  { value: 'video', label: 'Video (.mp4)' },
]

function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** File evidence: pick or drop a file, choose what kind it is, then Check File. */
export function FileForm({ onSubmit, pending, busy }) {
  const [file, setFile] = useState(null)
  const [filetype, setFileType] = useState('file')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function pick(f) {
    if (!f) return
    setFile(f)
    setError('')
  }

  function submit(e) {
    e.preventDefault()
    if (busy) return
    if (!file) {
      setError('Choose a file to check.')
      inputRef.current?.focus()
      return
    }
    onSubmit(file, filetype)
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field>
        <FieldLabel htmlFor="file-type">What kind of file is it?</FieldLabel>
        <Select value={filetype} onValueChange={setFileType}>
          <SelectTrigger id="file-type" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field data-invalid={Boolean(error) || undefined}>
        <span className="text-sm font-medium" id="file-label">
          File
        </span>
        <label
          htmlFor="evidence-file"
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pick(e.dataTransfer.files?.[0])
          }}
          className={cn(
            'hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors',
            'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-3',
            dragging && 'border-ring bg-muted/50',
            error && 'border-destructive',
          )}
        >
          <input
            ref={inputRef}
            id="evidence-file"
            type="file"
            className="sr-only"
            aria-labelledby="file-label"
            aria-describedby="file-help"
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <span className="bg-muted flex size-9 items-center justify-center rounded-md">
            <FileUp className="size-4" aria-hidden />
          </span>
          {file ? (
            <>
              <span className="max-w-full truncate text-sm font-medium" title={file.name}>
                {file.name}
              </span>
              <span className="text-muted-foreground font-mono text-xs tabular">{formatSize(file.size)} · click to change</span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium">Drop a file here, or click to choose one</span>
              <span className="text-muted-foreground text-xs">Apps (.apk), documents, screenshots, audio or video</span>
            </>
          )}
        </label>
        <FieldDescription id="file-help">
          The file is stored in the evidence vault before it’s checked, so it can’t be changed later.
        </FieldDescription>
        <FieldError>{error}</FieldError>
      </Field>

      <Button type="submit" className="h-10 w-full sm:w-auto" disabled={busy}>
        {pending && <Spinner />}
        Check File
      </Button>
    </form>
  )
}
