import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { FormStatus } from '@/components/auth/form-status'
import { NETWORK_ERROR, focusFirstError, maskPhone } from '@/components/auth/helpers'
import { api } from '@/lib/api'
import { OtpStore } from '@/lib/store'

/** Step 1 for CERT-Army officials: ID + password. Calls onVerified() so the page can show the code step. */
export function OfficialSignIn({ values, setValue, onVerified }) {
  const { setnumber } = OtpStore()
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [pending, setPending] = useState(false)
  const busy = useRef(false)

  function change(name) {
    return (e) => {
      setValue(name, e.target.value)
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (busy.current) return
    const next = {
      officialId: values.officialId.trim() ? '' : 'Enter your official ID.',
      officialPassword: values.officialPassword ? '' : 'Enter your password.',
    }
    setErrors(next)
    if (next.officialId || next.officialPassword) {
      focusFirstError(
        { 'official-id': next.officialId, 'official-password': next.officialPassword },
        ['official-id', 'official-password'],
      )
      return
    }

    busy.current = true
    setPending(true)
    setStatus(null)
    try {
      const { status: code, data } = await api.loginOfficial({
        officialId: values.officialId.trim(),
        department: values.department.trim(),
        password: values.officialPassword,
      })
      if (code === 200) {
        localStorage.setItem('logintoken', data?.token)
        const phone = data?.official?.phone || data?.official?.phoneNumber || '+91-9876543210'
        setnumber(phone)
        onVerified()
        return
      }
      setStatus({ tone: 'error', text: data?.msg || 'That ID and password don’t match. Check them and try again.' })
    } catch (err) {
      console.error(err)
      setStatus({ tone: 'error', text: NETWORK_ERROR })
    }
    busy.current = false
    setPending(false)
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="CERT-Army official sign in">
      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.officialId) || undefined}>
          <FieldLabel htmlFor="official-id">Official ID</FieldLabel>
          <Input
            id="official-id"
            name="username"
            autoComplete="username"
            spellCheck={false}
            autoCapitalize="characters"
            placeholder="ARMY-CERT-01…"
            value={values.officialId}
            onChange={change('officialId')}
            aria-invalid={Boolean(errors.officialId) || undefined}
            aria-describedby={errors.officialId ? 'official-id-error' : undefined}
            className="h-10 font-mono"
          />
          <FieldError id="official-id-error">{errors.officialId}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="official-department">
            Department <span className="text-muted-foreground font-normal">(optional)</span>
          </FieldLabel>
          <Input
            id="official-department"
            name="department"
            autoComplete="organization"
            spellCheck={false}
            placeholder="defense…"
            value={values.department}
            onChange={change('department')}
            className="h-10"
          />
        </Field>
        <Field data-invalid={Boolean(errors.officialPassword) || undefined}>
          <FieldLabel htmlFor="official-password">Password</FieldLabel>
          <Input
            id="official-password"
            type="password"
            autoComplete="current-password"
            value={values.officialPassword}
            onChange={change('officialPassword')}
            aria-invalid={Boolean(errors.officialPassword) || undefined}
            aria-describedby={errors.officialPassword ? 'official-password-error' : undefined}
            className="h-10"
          />
          <FieldError id="official-password-error">{errors.officialPassword}</FieldError>
        </Field>
        <Button type="submit" className="h-11 w-full" aria-disabled={pending || undefined}>
          {pending && <Spinner aria-hidden />}
          Continue
        </Button>
        <FormStatus status={status} />
        <p className="text-muted-foreground text-center text-sm text-balance">
          Official accounts are issued by CERT-Army. If you need one, ask your unit’s CERT-Army administrator.
        </p>
      </FieldGroup>
    </form>
  )
}

/**
 * Step 2: send a code to the official's registered phone, then verify it.
 * sendState follows the old page: idle -> sending -> sent | failed (try again) | error (retry).
 */
export function OfficialTwoFactor({ code, setCode, onRestart }) {
  const navigate = useNavigate()
  const { number } = OtpStore()
  const [sendState, setSendState] = useState('idle')
  const [verifying, setVerifying] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [status, setStatus] = useState(null)
  const [demoCode, setDemoCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const busy = useRef(false)
  const codeRef = useRef(null)
  const masked = maskPhone(number)

  const missingNumber = () =>
    setStatus({ tone: 'error', text: 'We don’t have a phone number for this session. Sign in again to get a new code.' })

  async function sendCode() {
    if (busy.current) return
    if (!number) return missingNumber()
    busy.current = true
    setSendState('sending')
    setStatus(null)
    try {
      const { data } = await api.sendOtp(number)
      if (data?.status) {
        setSendState('sent')
        setCodeSent(true)
        setCodeError('')
        if (data.testOtp) {
          setCode(String(data.testOtp))
          setDemoCode(String(data.testOtp))
          setStatus({ tone: 'info', text: 'Demo mode: no text message was sent. The code is shown below and already filled in.' })
        } else {
          setDemoCode('')
          setStatus({ tone: 'success', text: `We sent a verification code to ${masked}.` })
        }
        requestAnimationFrame(() => codeRef.current?.focus())
      } else {
        setSendState('failed')
        setStatus({ tone: 'error', text: data?.msg || 'We couldn’t send the code. Try again in a moment.' })
      }
    } catch (err) {
      console.error(err)
      setSendState('error')
      setStatus({ tone: 'error', text: NETWORK_ERROR })
    }
    busy.current = false
  }

  async function verify(e) {
    e.preventDefault()
    if (busy.current) return
    if (!number) return missingNumber()
    const value = code.trim()
    if (!value) {
      setCodeError('Enter the code from your phone.')
      codeRef.current?.focus()
      return
    }
    setCodeError('')
    busy.current = true
    setVerifying(true)
    setStatus(null)
    try {
      const { data } = await api.verifyOtp(number, value)
      if (data?.status) {
        navigate('/officialpage')
        return
      }
      setStatus({ tone: 'error', text: data?.msg || 'That code is wrong or has expired. Check it, or send a new code.' })
    } catch (err) {
      console.error(err)
      setStatus({ tone: 'error', text: NETWORK_ERROR })
    }
    busy.current = false
    setVerifying(false)
  }

  const sending = sendState === 'sending'
  const sendLabel = sendState === 'error' ? 'Retry Send Code' : sendState === 'failed' ? 'Try Again' : 'Send Code'

  return (
    <div className="grid gap-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Verify It’s You</h2>
        <p className="text-muted-foreground text-sm">
          Your ID and password are correct. To finish, we’ll send a one-time code to your registered phone{' '}
          {masked ? (
            <span className="text-foreground font-mono tabular whitespace-nowrap">{masked}</span>
          ) : (
            'number'
          )}
          .
        </p>
      </div>

      {!codeSent ? (
        <Button type="button" className="h-11 w-full" onClick={sendCode} aria-disabled={sending || undefined}>
          {sending && <Spinner aria-hidden />}
          {sendLabel}
        </Button>
      ) : (
        <form onSubmit={verify} noValidate aria-label="Verify code">
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(codeError) || undefined}>
              <FieldLabel htmlFor="official-code">Verification code</FieldLabel>
              <Input
                ref={codeRef}
                id="official-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                placeholder="123456…"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  if (codeError) setCodeError('')
                }}
                aria-invalid={Boolean(codeError) || undefined}
                aria-describedby={codeError ? 'official-code-error' : demoCode ? 'official-code-demo' : undefined}
                className="h-11 text-center font-mono text-lg tracking-[0.3em] tabular"
              />
              {demoCode && (
                <FieldDescription id="official-code-demo">
                  Demo code: <span className="text-foreground font-mono tabular">{demoCode}</span>
                </FieldDescription>
              )}
              <FieldError id="official-code-error">{codeError}</FieldError>
            </Field>
            <Button type="submit" className="h-11 w-full" aria-disabled={verifying || undefined}>
              {verifying && <Spinner aria-hidden />}
              Verify Code
            </Button>
            <Button type="button" variant="ghost" className="h-9 w-full" onClick={sendCode} aria-disabled={sending || undefined}>
              {sending && <Spinner aria-hidden />}
              {sendState === 'error' ? 'Retry Send Code' : 'Send a New Code'}
            </Button>
          </FieldGroup>
        </form>
      )}

      <FormStatus status={status} />

      <Button type="button" variant="link" className="text-muted-foreground mx-auto h-auto p-0" onClick={onRestart}>
        Use a Different Account
      </Button>
    </div>
  )
}
