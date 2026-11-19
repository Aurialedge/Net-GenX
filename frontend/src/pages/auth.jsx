import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Logo } from '@/components/app/logo'
import { PageShell } from '@/components/app/page-shell'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DemoAccounts } from '@/components/auth/demo-accounts'
import { DEMO_OFFICIAL, DEMO_PERSONNEL } from '@/components/auth/helpers'
import { OfficialSignIn, OfficialTwoFactor } from '@/components/auth/official-forms'
import { PersonnelRegister, PersonnelSignIn } from '@/components/auth/personnel-forms'

const EMPTY = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  officialId: '',
  department: '',
  officialPassword: '',
  securityCode: '',
}

function AuthHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

/**
 * /auth — personnel sign in or register (?mode=register), CERT-Army official sign in (?role=official)
 * followed by a one-time code sent to the official's registered phone.
 */
export default function Auth() {
  const [params, setParams] = useSearchParams()
  const role = params.get('role') === 'official' ? 'official' : 'personnel'
  const registering = role === 'personnel' && params.get('mode') === 'register'

  const [values, setValues] = useState(EMPTY)
  const [twoFactor, setTwoFactor] = useState(false)
  // remounts a form (clearing its errors and messages) when it's re-entered or filled from the demo list
  const [formKey, setFormKey] = useState(0)

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }))

  function go(nextRole, nextMode) {
    const next = new URLSearchParams()
    if (nextRole === 'official') next.set('role', 'official')
    if (nextRole === 'personnel' && nextMode === 'register') next.set('mode', 'register')
    setParams(next, { replace: true })
    setTwoFactor(false)
    setFormKey((k) => k + 1)
  }

  function fillPersonnelDemo() {
    setValues((prev) => ({ ...prev, ...DEMO_PERSONNEL }))
    go('personnel')
  }

  function fillOfficialDemo() {
    setValues((prev) => ({
      ...prev,
      officialId: DEMO_OFFICIAL.officialId,
      department: DEMO_OFFICIAL.department,
      officialPassword: DEMO_OFFICIAL.password,
    }))
    go('official')
  }

  const heading = registering ? 'Create Your Account' : 'Sign In to NetGenX'
  const description = registering
    ? 'Your account lets you check suspicious messages and keep a record of what you report.'
    : role === 'official'
      ? 'For CERT-Army officials reviewing reported cases.'
      : 'Check suspicious messages and get clear next steps.'

  return (
    <PageShell
      title={registering ? 'Create Account' : 'Sign In'}
      header={<AuthHeader />}
      footer={false}
      width="narrow"
      className="flex flex-col items-center"
    >
      <div className="w-full max-w-sm space-y-6">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ml-1 inline-flex min-h-6 items-center gap-1.5 rounded-md px-1 text-sm outline-none focus-visible:ring-[3px]"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to Home
        </Link>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold">{heading}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="px-5 py-1">
            <Tabs value={role} onValueChange={(v) => go(v)} className="gap-5">
              <TabsList className="h-9 w-full">
                <TabsTrigger value="personnel">Personnel</TabsTrigger>
                <TabsTrigger value="official">CERT-Army Official</TabsTrigger>
              </TabsList>

              <TabsContent value="personnel">
                {registering ? (
                  <PersonnelRegister
                    key={`register-${formKey}`}
                    values={values}
                    setValue={setValue}
                    onSignIn={() => go('personnel')}
                  />
                ) : (
                  <PersonnelSignIn
                    key={`signin-${formKey}`}
                    values={values}
                    setValue={setValue}
                    onRegister={() => go('personnel', 'register')}
                  />
                )}
              </TabsContent>

              <TabsContent value="official">
                {twoFactor ? (
                  <OfficialTwoFactor
                    key={`otp-${formKey}`}
                    code={values.securityCode}
                    setCode={(v) => setValue('securityCode', v)}
                    onRestart={() => go('official')}
                  />
                ) : (
                  <OfficialSignIn
                    key={`official-${formKey}`}
                    values={values}
                    setValue={setValue}
                    onVerified={() => setTwoFactor(true)}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <DemoAccounts onUsePersonnel={fillPersonnelDemo} onUseOfficial={fillOfficialDemo} />
      </div>
    </PageShell>
  )
}
