import { ArrowRight, Building2, FileLock2, MessageSquareText, Phone, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageShell } from '@/components/app/page-shell'
import { SiteHeader } from '@/components/app/site-header'
import { RiskMeter } from '@/components/app/risk-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const THREATS = [
  {
    title: 'Honeytraps',
    body: 'A friendly or romantic stranger who slowly steers the chat towards photos, your location or your unit.',
  },
  {
    title: 'Phishing and Fraud',
    body: 'Fake pension, salary or bank notices that ask for an OTP, password or card details, or push you to a look-alike website.',
  },
  {
    title: 'Malware',
    body: 'An APK, document or link that installs something on your phone, often dressed up as an official app or circular.',
  },
  {
    title: 'Blackmail',
    body: 'Threats to leak photos, videos or chats unless you pay or hand over information.',
  },
  {
    title: 'Information Gathering',
    body: 'Casual-sounding questions about postings, movements, equipment or troop numbers that should never leave your unit.',
  },
]

const STEPS = [
  {
    title: 'Paste or Upload',
    body: 'Paste the message, upload a WhatsApp or Telegram chat export, or attach the file you were sent.',
  },
  {
    title: 'Get a Risk Score and What to Do',
    body: 'You get a score out of 100, the kind of threat it looks like, and clear steps for your situation.',
  },
  {
    title: 'Serious Cases Go to CERT-Army',
    body: 'At 80 or more, the case is handed to CERT-Army with the evidence and a tamper-proof record of it.',
  },
]

function SectionHeading({ id, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-1.5">
        <h2 id={id} className="text-xl font-semibold sm:text-2xl">
          {title}
        </h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function ExampleResult() {
  return (
    <Card className="shadow-sm" aria-label="Example result">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Example Result</CardTitle>
          <Badge variant="outline">Sample</Badge>
        </div>
        <CardDescription>What you see after checking a message.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <blockquote className="bg-muted text-foreground rounded-lg border px-3 py-2.5 text-sm break-words">
          “Hi, I saw your photo in uniform, you look so smart. Which unit are you posted with now? Send a pic from your
          post na…”
        </blockquote>
        <RiskMeter score={86} />
        <div className="space-y-1">
          <p className="text-sm font-medium">Honeytrap</p>
          <p className="text-muted-foreground text-sm">
            Stop replying, don’t send photos or location, and keep the chat. This case has been handed over to
            CERT-Army.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  return (
    <PageShell
      title="Home"
      header={
        <SiteHeader
          actions={
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Sign In</Link>
            </Button>
          }
        />
      }
    >
      {/* Hero */}
      <section aria-labelledby="hero-title" className="grid items-center gap-10 pb-12 sm:pb-16 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">For Indian defence personnel and their families</p>
          <h1 id="hero-title" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Got a message that doesn’t feel right? Check it before you reply.
          </h1>
          <p className="text-muted-foreground max-w-xl text-base text-pretty sm:text-lg">
            Paste a message, a whole chat or a file. NetGenX tells you how risky it is and what to do next, and hands
            serious cases straight to CERT-Army.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-5">
              <Link to="/upload">
                Check a Message
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-5">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Works in English, Hinglish and Hindi. WhatsApp and Telegram chat exports are supported.
          </p>
        </div>
        <ExampleResult />
      </section>

      <Separator />

      {/* What it catches */}
      <section aria-labelledby="catches-title" className="py-12 sm:py-16">
        <SectionHeading
          id="catches-title"
          title="What It Catches"
          description="The tricks most often used against people in uniform. A message can match more than one."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THREATS.map((t) => (
            <li key={t.title} className="bg-card rounded-xl border p-5">
              <h3 className="font-medium">{t.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">{t.body}</p>
            </li>
          ))}
          <li className="bg-muted/50 flex flex-col justify-between gap-4 rounded-xl border border-dashed p-5">
            <p className="text-muted-foreground text-sm">
              Not sure which of these it is? You don’t need to know. Paste it and NetGenX will tell you.
            </p>
            <Button asChild variant="outline" className="h-11 w-fit sm:h-8">
              <Link to="/upload">Check a Message</Link>
            </Button>
          </li>
        </ul>
      </section>

      <Separator />

      {/* How it works */}
      <section aria-labelledby="how-title" className="py-12 sm:py-16">
        <SectionHeading
          id="how-title"
          title="How It Works"
          description="Three steps, usually in under a minute."
          action={
            <Button asChild variant="ghost" className="w-fit">
              <Link to="/workflow">
                See the Full Process
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          }
        />
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 md:flex-col md:gap-3">
              <span
                aria-hidden
                className="bg-foreground text-background flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-sm tabular"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-medium">{s.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
          <div className="border-success/30 bg-success-muted text-success-foreground rounded-lg border px-4 py-3">
            <span className="font-medium">Below 40:</span> no threat found.
          </div>
          <div className="border-warning/40 bg-warning-muted text-warning-foreground rounded-lg border px-4 py-3">
            <span className="font-medium">40 to 79:</span> personalised steps to handle it yourself.
          </div>
          <div className="border-danger/30 bg-danger-muted text-danger-foreground rounded-lg border px-4 py-3">
            <span className="font-medium">80 or more:</span> handed to CERT-Army.
          </div>
        </div>
      </section>

      <Separator />

      {/* Officials + already shared */}
      <section aria-label="Officials and urgent help" className="grid gap-6 py-12 sm:py-16 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 aria-hidden className="text-muted-foreground size-4" />
              <h2 className="text-lg font-semibold">For CERT-Army Officials</h2>
            </div>
            <CardDescription>
              Every case that scores 80 or more lands in your case list with the original evidence, the AI’s assessment
              and a tamper-proof record of both.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li className="flex gap-2">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
                Sign in with your Official ID, password and a one-time code.
              </li>
              <li className="flex gap-2">
                <FileLock2 aria-hidden className="mt-0.5 size-4 shrink-0" />
                Open the stored evidence alongside its record on the ledger.
              </li>
              <li className="flex gap-2">
                <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0" />
                See who reported it and what the AI found.
              </li>
            </ul>
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button asChild className="h-11 sm:h-8">
              <Link to="/auth">Official Sign In</Link>
            </Button>
            <Button asChild variant="ghost" className="h-11 sm:h-8">
              <Link to="/officialpage">Open Case List</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone aria-hidden className="text-muted-foreground size-4" />
              <h2 className="text-lg font-semibold">If You Already Shared Something</h2>
            </div>
            <CardDescription>
              It happens, and acting quickly matters more than anything else. Don’t delete the chat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ol className="text-muted-foreground list-decimal space-y-1.5 pl-5">
              <li>Stop replying and don’t send money, codes or more photos.</li>
              <li>If you shared an OTP, password or card details, call your bank and change the password now.</li>
              <li>Report it to your unit and check the message here so there is a record.</li>
            </ol>
            <div className="bg-muted rounded-lg border p-4">
              <p className="text-muted-foreground">National cyber-crime helpline</p>
              <a
                href="tel:1930"
                className="mt-0.5 inline-block rounded-sm font-mono text-2xl font-semibold tabular outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                1930
              </a>
              <p className="text-muted-foreground mt-2">
                Or report online at{' '}
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground font-medium underline underline-offset-4"
                >
                  cybercrime.gov.in
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  )
}
