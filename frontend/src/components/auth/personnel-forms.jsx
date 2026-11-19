import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { FormStatus } from '@/components/auth/form-status'
import { NETWORK_ERROR, emailError, focusFirstError, wait } from '@/components/auth/helpers'
import { api } from '@/lib/api'
import { userStore } from '@/lib/store'

/** Email field with the old page's live format check (shown once you leave the field or submit). */
function EmailField({ id, value, error, onChange, onBlur }) {
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>Email</FieldLabel>
      <Input
        id={id}
        name="email"
        type="email"
        autoComplete="email"
        spellCheck={false}
        autoCapitalize="none"
        placeholder="officer@army.mil…"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-10"
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  )
}

function PasswordField({ id, label, value, error, onChange, autoComplete }) {
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-10"
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  )
}

/** Personnel sign in. */
export function PersonnelSignIn({ values, setValue, onRegister }) {
  const navigate = useNavigate()
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [pending, setPending] = useState(false)
  const busy = useRef(false)

  function change(name) {
    return (e) => {
      setValue(name, e.target.value)
      // re-check an error that is already showing, so it clears as soon as it's fixed
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: name === 'email' ? emailError(e.target.value) : '' }))
      }
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (busy.current) return
    const next = {
      'signin-email': emailError(values.email),
      'signin-password': values.password ? '' : 'Enter your password.',
    }
    setErrors({ email: next['signin-email'], password: next['signin-password'] })
    if (next['signin-email'] || next['signin-password']) {
      focusFirstError(next, ['signin-email', 'signin-password'])
      return
    }

    busy.current = true
    setPending(true)
    setStatus(null)
    const email = values.email.trim()
    try {
      const { status: code, data } = await api.loginUser({ email, password: values.password })
      if (code === 200) {
        localStorage.setItem('logintoken', data?.token)
        if (data?.name) {
          userStore.getState().setUser({ _id: data.id || 'usr_session', name: data.name, email: data.email || email })
        }
        setStatus({ tone: 'success', text: 'You’re signed in. Opening your dashboard…' })
        await wait(800)
        navigate('/upload')
        return
      }
      setStatus({ tone: 'error', text: data?.msg || 'That email and password don’t match. Check them and try again.' })
    } catch (err) {
      console.error(err)
      setStatus({ tone: 'error', text: NETWORK_ERROR })
    }
    busy.current = false
    setPending(false)
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Personnel sign in">
      <FieldGroup className="gap-4">
        <EmailField
          id="signin-email"
          value={values.email}
          error={errors.email}
          onChange={change('email')}
          onBlur={() => values.email && setErrors((prev) => ({ ...prev, email: emailError(values.email) }))}
        />
        <PasswordField
          id="signin-password"
          label="Password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={change('password')}
        />
        <Button type="submit" className="h-11 w-full" aria-disabled={pending || undefined}>
          {pending && <Spinner aria-hidden />}
          Sign In
        </Button>
        <FormStatus status={status} />
        <p className="text-muted-foreground text-center text-sm">
          New to NetGenX?{' '}
          <Button type="button" variant="link" className="h-auto p-0" onClick={onRegister}>
            Create an Account
          </Button>
        </p>
      </FieldGroup>
    </form>
  )
}

/** Personnel registration. After success it switches back to sign in (the old page waited 1.5s). */
export function PersonnelRegister({ values, setValue, onSignIn }) {
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [pending, setPending] = useState(false)
  const busy = useRef(false)

  function change(name) {
    return (e) => {
      setValue(name, e.target.value)
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: name === 'email' ? emailError(e.target.value) : '' }))
      }
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (busy.current) return
    const next = {
      fullName: values.fullName.trim() ? '' : 'Enter your name.',
      email: emailError(values.email),
      password: values.password.trim() ? '' : 'Choose a password.',
      confirmPassword: '',
    }
    if (!next.password && values.password !== values.confirmPassword) {
      next.confirmPassword = 'Passwords don’t match. Type the same password twice.'
    }
    setErrors(next)
    const order = ['fullName', 'email', 'password', 'confirmPassword']
    if (order.some((k) => next[k])) {
      focusFirstError(
        Object.fromEntries(order.map((k) => [`register-${k}`, next[k]])),
        order.map((k) => `register-${k}`),
      )
      return
    }

    busy.current = true
    setPending(true)
    setStatus(null)
    try {
      const { status: code, data } = await api.register({
        name: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      if (code === 200) {
        setStatus({ tone: 'success', text: `${data?.message || 'Account created.'} Taking you to sign in…` })
        await wait(1500)
        busy.current = false
        setPending(false)
        onSignIn()
        return
      }
      setStatus({ tone: 'error', text: data?.message || data?.msg || 'We couldn’t create your account. Check your details and try again.' })
    } catch (err) {
      console.error(err)
      setStatus({ tone: 'error', text: NETWORK_ERROR })
    }
    busy.current = false
    setPending(false)
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Create a personnel account">
      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.fullName) || undefined}>
          <FieldLabel htmlFor="register-fullName">Full name and rank</FieldLabel>
          <Input
            id="register-fullName"
            name="name"
            autoComplete="name"
            placeholder="Capt. Ramesh Kumar…"
            value={values.fullName}
            onChange={change('fullName')}
            aria-invalid={Boolean(errors.fullName) || undefined}
            aria-describedby={errors.fullName ? 'register-fullName-error' : undefined}
            className="h-10"
          />
          <FieldError id="register-fullName-error">{errors.fullName}</FieldError>
        </Field>
        <EmailField
          id="register-email"
          value={values.email}
          error={errors.email}
          onChange={change('email')}
          onBlur={() => values.email && setErrors((prev) => ({ ...prev, email: emailError(values.email) }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            id="register-password"
            label="Password"
            autoComplete="new-password"
            value={values.password}
            error={errors.password}
            onChange={change('password')}
          />
          <PasswordField
            id="register-confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            onChange={change('confirmPassword')}
          />
        </div>
        <Button type="submit" className="h-11 w-full" aria-disabled={pending || undefined}>
          {pending && <Spinner aria-hidden />}
          Create Account
        </Button>
        <FormStatus status={status} />
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{' '}
          <Button type="button" variant="link" className="h-auto p-0" onClick={onSignIn}>
            Sign In
          </Button>
        </p>
      </FieldGroup>
    </form>
  )
}
