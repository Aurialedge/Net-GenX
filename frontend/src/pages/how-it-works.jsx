import { ArrowRight, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeading, PageShell } from '@/components/app/page-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const SECTIONS = [
  { id: 'journey', label: 'The Journey of a Report' },
  { id: 'ai', label: 'How the AI Decides' },
  { id: 'chats', label: 'Checking a Whole Chat' },
  { id: 'data', label: 'What Happens to Your Data' },
]

const JOURNEY = [
  {
    title: 'Your Evidence Is Stored',
    body: 'The message, chat or file you submit is saved to IPFS, a storage network where every file is addressed by its own content. If anyone changed it later, its address would no longer match.',
    detail: 'Stored on IPFS. The returned content identifier (CID) is what the rest of the system refers to.',
  },
  {
    title: 'The AI Checks It',
    body: 'The message model and the 5 counter-intelligence layers read it and agree on a risk score from 0 to 100 and the kind of threat it looks like.',
    detail: 'Level-1 risk engine plus the 5-layer Counter-Intelligence Shield. See “How the AI Decides” below.',
  },
  {
    title: 'A Fingerprint Is Recorded',
    body: 'A fingerprint of the evidence and the result is written to a blockchain ledger. Entries can be added but not quietly edited, so the record stays trustworthy.',
    detail:
      'The CID and analysis result are always written to the ledger service’s local record, and also to a Solidity smart contract on a local Hardhat (Ethereum) network when the chain is running.',
  },
  {
    title: 'You Get a Decision',
    body: 'What happens next depends on the score.',
    bands: true,
  },
]

const BANDS = [
  {
    range: 'Below 40',
    title: 'No Threat Found',
    body: 'Nothing points to an attempt to get information, money or access. Stay alert if the conversation changes.',
    tone: 'border-success/30 bg-success-muted text-success-foreground',
  },
  {
    range: '40–79',
    title: 'Personalised Steps',
    body: 'You get steps written for your situation by Gemini, with a built-in playbook if Gemini can’t be reached. You can ask follow-up questions in Guidance.',
    tone: 'border-warning/40 bg-warning-muted text-warning-foreground',
  },
  {
    range: '80 or more',
    title: 'Handed to CERT-Army',
    body: 'The case goes to CERT-Army with full details. Officials sign in with their credentials and a one-time code, open the evidence from IPFS and the record from the ledger, and take action.',
    tone: 'border-danger/30 bg-danger-muted text-danger-foreground',
  },
]

const LAYERS = [
  {
    name: 'What Are They After?',
    tech: 'Layer 1 · Intent and elicitation',
    body: 'Spots the classic ways people draw information out of you, like flattery, pretending to already know, or offering something in return, and what they are steering towards: your unit, location, movements or equipment.',
    detail: 'Scores each elicitation technique against a target information category and infers the sender’s main intent.',
  },
  {
    name: 'Is This Part of a Campaign?',
    tech: 'Layer 2 · Threat graph',
    body: 'The same script is often sent to many people from many throw-away accounts. NetGenX links messages that share links, phone numbers, handles or near-identical wording, so one harmless-looking message can be seen as part of something bigger.',
    detail: 'A graph of messages, senders and indicators (domains, phone numbers, emails, handles, files, UPI IDs). Connected clusters are treated as campaigns.',
  },
  {
    name: 'Was This Written by an AI?',
    tech: 'Layer 3 · Synthetic text detection',
    body: 'Bots running on AI write differently from a real person typing on a phone: even sentence lengths, stock phrases, perfect punctuation and no typos. Images are checked for markers left by AI image generators.',
    detail: 'Stylometric signals for text; provenance metadata (generator tags, C2PA “trained algorithmic media”) for images.',
  },
  {
    name: 'Is This More Than They Should Know or Ask?',
    tech: 'Layer 4 · Zero-trust OPSEC',
    body: 'However friendly or official someone sounds, they haven’t earned access to service numbers, Aadhaar or PAN, OTPs, unit names, grid references or movement timings. Look-alike official websites are flagged too.',
    detail: 'Compares the sensitivity of what is requested or disclosed against the trust the sender has earned; also detects impersonated official domains.',
  },
  {
    name: 'Where Is the Conversation Heading?',
    tech: 'Layer 5 · Multi-turn trajectory',
    body: 'A patient bot starts with “Hi, how are you?”, moves to compliments, then asks which unit you’re in, and only later sends an app or makes threats. Each message alone can look fine; the direction gives it away.',
    detail: 'Maps each turn of the conversation onto the stages of a social-engineering progression and tracks how it moves over time.',
  },
]

function Disclosure({ summary = 'Technical Details', children }) {
  return (
    <details className="group mt-2 text-sm">
      <summary className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer list-none items-center gap-1 rounded-sm outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
        {summary}
      </summary>
      <p className="text-muted-foreground mt-2 border-l pl-3">{children}</p>
    </details>
  )
}

function Section({ id, title, description, children }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-20">
      <h2 id={id} className="text-xl font-semibold sm:text-2xl">
        {title}
      </h2>
      {description && <p className="text-muted-foreground mt-1.5 max-w-2xl">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function StepNumber({ n }) {
  return (
    <span
      aria-hidden
      className="bg-foreground text-background flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-sm tabular"
    >
      {n}
    </span>
  )
}

export default function HowItWorks() {
  return (
    <PageShell title="How It Works">
      <PageHeading
        title="How NetGenX Works"
        description="What happens between pasting a message and getting an answer, how the AI reaches its score, and where your evidence goes."
        actions={
          <Button asChild className="h-11 sm:h-8">
            <Link to="/upload">
              Check a Message
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-20">
            <p className="text-muted-foreground mb-2 text-xs font-medium">On This Page</p>
            <ul className="space-y-1 text-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-muted-foreground hover:text-foreground block rounded-sm py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="min-w-0 space-y-12">
          <Section
            id="journey"
            title="The Journey of a Report"
            description="Every check goes through the same 4 steps, whether it’s one message, a chat export or a file."
          >
            <ol className="space-y-8">
              {JOURNEY.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <StepNumber n={i + 1} />
                    {i < JOURNEY.length - 1 && <span aria-hidden className="bg-border mt-2 w-px flex-1" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <h3 className="font-medium">{step.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">{step.body}</p>
                    {step.detail && <Disclosure>{step.detail}</Disclosure>}
                    {step.bands && (
                      <ul className="mt-4 grid gap-3 md:grid-cols-3">
                        {BANDS.map((b) => (
                          <li key={b.range} className={`rounded-lg border p-4 ${b.tone}`}>
                            <p className="font-mono text-xs tabular">{b.range}</p>
                            <p className="mt-1 font-medium">{b.title}</p>
                            <p className="mt-1.5 text-sm opacity-90">{b.body}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Separator />

          <Section
            id="ai"
            title="How the AI Decides"
            description="Two parts work together: a model that reads the message itself, and 5 layers that look for the things a single message can’t show."
          >
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg font-semibold">
                    <h3>The Message Model</h3>
                  </CardTitle>
                  <Badge variant="secondary">Level 1</Badge>
                </div>
                <CardDescription>
                  Reads the message and decides two things: what kind of threat it looks like (honeytrap, phishing or
                  fraud, malware, blackmail, information gathering, or nothing) and how dangerous it is.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Some things are dangerous no matter how the message is worded, such as a request for your OTP or PIN,
                  an attached APK or disguised program, a look-alike login page or a threat to leak something. When
                  NetGenX sees one, the score can’t drop below a safe minimum. It reads English, Hinglish and Hindi;
                  for other scripts, links, files and credential requests are still checked.
                </p>
                <Disclosure>
                  Two trained heads: a category head (logistic regression with a calibrated linear SVM ensemble) and a
                  severity head (Low / Medium / High). The risk score is the expected severity across those
                  probabilities. Hard-evidence rules then set score floors. If the saved model can’t load, it retrains
                  from the dataset, and failing that falls back to keyword heuristics, so it always answers.
                </Disclosure>
              </CardContent>
            </Card>

            <h3 className="mt-10 font-medium">The 5 Counter-Intelligence Layers</h3>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Each layer asks one question. They run separately, so if one fails the others still give a verdict. The
              layers can raise a score above the message model’s, but only push a case to CERT-Army on evidence a
              single message can’t show, such as a campaign, a look-alike sender or the direction of a conversation.
            </p>
            <ol className="mt-5 divide-y rounded-xl border">
              {LAYERS.map((l, i) => (
                <li key={l.tech} className="flex gap-4 p-4 sm:p-5">
                  <StepNumber n={i + 1} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <h4 className="font-medium">{l.name}</h4>
                      <span className="text-muted-foreground text-xs">{l.tech}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{l.body}</p>
                    <Disclosure>{l.detail}</Disclosure>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Separator />

          <Section
            id="chats"
            title="Checking a Whole Chat"
            description="Upload a WhatsApp export (Android or iPhone), a Telegram JSON export, a CSV, or paste the conversation."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-medium">It Reads the Conversation, Not Just Messages</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  A separate conversation model looks at how the chat develops from start to finish: how quickly it
                  moves from small talk to personal questions, whether it drifts towards military topics, and whether
                  the other person asks you to keep things secret or move to another app.
                </p>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-medium">It Notices When Someone Won’t Take No</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  If you refuse, in English or Hinglish, and they keep asking in different ways, that persistence is
                  itself a warning sign and raises the score. Ordinary small talk on its own does not.
                </p>
              </div>
            </div>
            <Disclosure>
              Each conversation is turned into one set of features built from the layer outputs: per-message scores from
              the message model, elicitation and secrecy signals (layer 1), grooming stage, refusals and probing after
              them (layer 5), and writing style and trust checks on the other person’s combined text (layers 3 and 4).
              A gradient-boosted classifier trained on 10,000 synthetic conversations maps these to Low, Medium or High.
            </Disclosure>
          </Section>

          <Separator />

          <Section id="data" title="What Happens to Your Data">
            <ul className="space-y-4 text-sm">
              <li className="bg-card rounded-xl border p-5">
                <h3 className="font-medium">Evidence Is Kept, Not Edited</h3>
                <p className="text-muted-foreground mt-1.5">
                  What you submit is stored on IPFS and its fingerprint is recorded on the blockchain ledger. That is
                  what makes it usable later: anyone reviewing the case can confirm it hasn’t been changed.
                </p>
              </li>
              <li className="bg-card rounded-xl border p-5">
                <h3 className="font-medium">Only CERT-Army Officials See Escalated Cases</h3>
                <p className="text-muted-foreground mt-1.5">
                  Cases scoring 80 or more are shown in the CERT-Army case list. Officials must sign in with their
                  credentials and a one-time code before they can open them.
                </p>
              </li>
              <li className="bg-card rounded-xl border p-5">
                <h3 className="font-medium">Gemini Is Used for Advice</h3>
                <p className="text-muted-foreground mt-1.5">
                  To write personalised steps and answer your follow-up questions, NetGenX sends the relevant text to
                  Google’s Gemini. If Gemini doesn’t answer in time, a built-in playbook gives the steps instead.
                </p>
              </li>
              <li className="bg-card rounded-xl border p-5">
                <h3 className="font-medium">Remove Sensitive Details You Don’t Need to Share</h3>
                <p className="text-muted-foreground mt-1.5">
                  NetGenX needs what the other person sent you. You don’t have to include your own passwords, codes or
                  operational details for the check to work.
                </p>
              </li>
            </ul>
          </Section>

          <Card className="bg-muted/50 shadow-none">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Have a Message You’re Unsure About?</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Check it now. If you already shared something, call <span className="tabular">1930</span> or report
                  at{' '}
                  <a
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground underline underline-offset-4"
                  >
                    cybercrime.gov.in
                  </a>
                  .
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="h-11 sm:h-8">
                  <Link to="/upload">Check a Message</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 sm:h-8">
                  <Link to="/auth">Sign In</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
