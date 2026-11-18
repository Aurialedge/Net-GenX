import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CircleAlert, FileUp, MessageSquareText, MessagesSquare, ShieldCheck } from 'lucide-react'
import { PageHeading, PageShell } from '@/components/app/page-shell'
import { SiteHeader } from '@/components/app/site-header'
import { ChatHistoryForm } from '@/components/dashboard/chat-history-form'
import { FileForm } from '@/components/dashboard/file-form'
import { MessageForm } from '@/components/dashboard/message-form'
import { PipelineProgress } from '@/components/dashboard/pipeline-progress'
import { ResultCard } from '@/components/dashboard/result-card'
import { describeError } from '@/components/dashboard/tone'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, evidenceUrl } from '@/lib/api'
import { userStore } from '@/lib/store'

const TABS = ['message', 'chat', 'file']
const GUIDANCE_DELAY = 8 // seconds before a CERT-Army case opens the guidance page

const LINKS = [
  { to: '/upload', label: 'Check' },
  { to: '/chat', label: 'Guidance' },
  { to: '/officialpage', label: 'CERT-Army View' },
  { to: '/workflow', label: 'How It Works' },
]

function storedName() {
  try {
    return JSON.parse(localStorage.getItem('user-storage') || '{}')?.state?.user?.name
  } catch {
    return undefined
  }
}

function clientName() {
  const { user } = userStore.getState()
  return user?.name || user?.email || 'Defence_Personnel'
}

function ResultSkeleton() {
  return (
    <Card aria-hidden>
      <CardHeader className="gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-1.5 w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </CardContent>
    </Card>
  )
}

function NothingYet() {
  return (
    <Empty className="bg-card border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldCheck />
        </EmptyMedia>
        <EmptyTitle className="text-base">Nothing Checked Yet</EmptyTitle>
        <EmptyDescription>Your result will appear here. There are three ways to check something:</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ul className="w-full space-y-3 text-left text-sm">
          <li className="flex gap-3">
            <MessageSquareText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="font-medium">Message</span>
              <span className="text-muted-foreground"> — paste a single message, SMS or link.</span>
            </span>
          </li>
          <li className="flex gap-3">
            <MessagesSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="font-medium">Chat History</span>
              <span className="text-muted-foreground">
                {' '}
                — upload a WhatsApp or Telegram export to see how the whole conversation developed.
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <FileUp className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="font-medium">File</span>
              <span className="text-muted-foreground"> — add an app, document, screenshot, audio or video you were sent.</span>
            </span>
          </li>
        </ul>
        <p className="text-muted-foreground text-left text-sm">
          You get a risk score out of 100. At 80 or more the case goes to CERT-Army with full details; from 40 to 79 you get
          personalised steps; below 40 no threat was found.
        </p>
      </EmptyContent>
    </Empty>
  )
}

export default function Dashboard() {
  const { user, setUser } = userStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'message'

  const [report, setReport] = useState(null)
  const [reportFresh, setReportFresh] = useState(false) // report belongs to the run in progress
  const [evidence, setEvidence] = useState(null) // { cid, link } of the vaulted evidence for this report
  const [mitigationSource, setMitigationSource] = useState('') // '' | loading | gemini | rules | model
  const [escalation, setEscalation] = useState(null) // { state: 'sent', caseId, emailed } | { state: 'failed' }
  const [countdown, setCountdown] = useState(null) // seconds until /chat opens, null = not counting
  const [pipelineStep, setPipelineStep] = useState(0) // 0 idle, 1 fingerprint, 2 vault, 3 AI, 4 ledger, 5 done
  const [currentStage, setCurrentStage] = useState('')
  const [running, setRunning] = useState(null) // 'message' | 'chat' | 'file' | null
  const [aiError, setAiError] = useState(null) // { title, description }
  const stageTimer = useRef(null)
  const resultRef = useRef(null)

  // Check login credentials on load
  useEffect(() => {
    api
      .getCredentials()
      .then(({ ok, data }) => {
        if (ok && data?.userfromdb) setUser(data.userfromdb)
      })
      .catch((err) => console.log('Logincheck info:', err.message))
  }, [setUser])

  // High-risk case: count down, then open the guidance page (cancellable)
  useEffect(() => {
    if (countdown == null) return
    const timer = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null)
        navigate('/chat')
      } else {
        setCountdown(countdown - 1)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown, navigate])

  useEffect(() => () => clearTimeout(stageTimer.current), [])

  const displayName = user?.name || storedName()

  function setTab(value) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', value)
        return next
      },
      { replace: true },
    )
  }

  function step(n, text) {
    setPipelineStep(n)
    setCurrentStage(text)
  }

  function begin(mode) {
    clearTimeout(stageTimer.current)
    setRunning(mode)
    setReportFresh(false)
    setAiError(null)
    setCountdown(null)
    // on narrow screens the result sits below the form; bring the progress into view
    if (window.matchMedia('(max-width: 1023px)').matches) {
      resultRef.current?.scrollIntoView({ block: 'start' })
    }
  }

  function complete(recorded) {
    step(5, recorded ? 'Done. The result is recorded on the ledger.' : 'Done.')
    stageTimer.current = setTimeout(() => setCurrentStage(''), 4000)
  }

  // Above threshold: hand the full case over to CERT-Army
  async function escalateToCert(data, text, contentCid, inputType) {
    const { user: u } = userStore.getState()
    try {
      const res = await api.escalate({
        reporter: [u?.name, u?.email].filter(Boolean).join(' / ') || 'Defence personnel',
        riskScore: data.final_risk_score,
        threatLevel: data.threat_level,
        threshold: data.escalation_threshold,
        category: data.final_prediction,
        confidence: data.final_confidence,
        details: data.details,
        engine: data.analysis_engine,
        counterIntelVerdict: data.counter_intel?.verdict,
        mitigationSteps: data.mitigation_steps,
        message: text,
        cid: contentCid,
        inputType,
      })
      if (!res.data?.status) throw new Error(res.data?.error || `HTTP ${res.status}`)
      setEscalation({ state: 'sent', caseId: res.data.caseId, emailed: Boolean(res.data.emailed) })
      setCountdown(GUIDANCE_DELAY)
    } catch (err) {
      console.error('Escalation error:', err)
      setEscalation({ state: 'failed' })
    }
  }

  // 40–79: personalised mitigation steps from Gemini (falls back to the defence playbook)
  async function fetchGeminiMitigation(data, text) {
    setMitigationSource('loading')
    try {
      const res = await api.guidance({
        message: text,
        category: data.final_prediction,
        riskScore: data.final_risk_score,
        threatLevel: data.threat_level,
        evidence: data.details,
      })
      const steps = res.data?.status && res.data.data ? Object.values(res.data.data).filter(Boolean) : []
      if (!steps.length) throw new Error('no steps returned')
      // only replace the steps if the user has not started a newer analysis meanwhile
      setReport((prev) => (prev === data ? { ...data, mitigation_steps: steps } : prev))
      setMitigationSource(res.data.source === 'gemini' ? 'gemini' : 'rules')
    } catch (err) {
      console.error('Gemini mitigation error:', err)
      setMitigationSource('model')
    }
  }

  // Shared tail of every analysis: notarise on the ledger, then escalate or fetch guidance.
  async function finishAnalysis(data, contentCid, evidenceText, inputType, vault) {
    setReport(data)
    setReportFresh(true)
    setEvidence(vault)
    setEscalation(null)
    setMitigationSource('model')

    const note = `${data.final_risk_score} ${data.final_prediction?.replace(/\s+/g, '_') || 'Threat_Report'} ${inputType}`
    if (contentCid) {
      step(4, 'Recording the fingerprint on the ledger…')
      try {
        await api.notarize(contentCid, note)
      } catch (err) {
        console.error('[BLOCKCHAIN ERROR]', err)
      }
    }

    // the /chat guidance page reads this to brief Gemini on the actual case
    localStorage.setItem('record', JSON.stringify({ ...data, reported_message: evidenceText }))

    // escalate_cert_army is decided by the AI engine against its configured threshold
    if (data.escalate_cert_army) {
      await escalateToCert(data, evidenceText, contentCid, inputType)
    } else if (data.final_risk_score >= 40) {
      fetchGeminiMitigation(data, evidenceText) // not awaited: steps fill in when ready
    }
  }

  // Single message or file: AI engine, then the shared tail.
  async function runPredict(input, contentCid, vault, evidenceText, inputType, noun) {
    step(3, 'Checking it with the AI engine…')
    try {
      const { status, data } = await api.predict(input)
      if (typeof data?.final_risk_score !== 'number') {
        throw new Error(data?.error || `The AI engine returned HTTP ${status}.`)
      }
      await finishAnalysis(data, contentCid, evidenceText, inputType, vault)
      complete(Boolean(contentCid))
    } catch (err) {
      console.error('AI Analysis error:', err)
      setAiError({
        title: `Couldn’t check this ${noun}`,
        description:
          err instanceof TypeError
            ? describeError(err)
            : `${describeError(err)} Try again. If it keeps happening, check the AI engine’s logs.`,
      })
      setPipelineStep(5)
      setCurrentStage('')
    }
  }

  async function checkMessage(text) {
    begin('message')
    step(1, 'Creating a fingerprint of the message…')
    step(2, 'Storing the message in the evidence vault…')
    let contentCid
    let vault = null
    try {
      const { data } = await api.uploadText(text, clientName())
      if (!data?.status) throw new Error(data?.message || data?.error || 'upload rejected')
      contentCid = data.cid
      vault = { cid: data.cid, link: data.url || evidenceUrl(data.cid) }
    } catch (err) {
      console.error('Error in text IPFS upload:', err)
      contentCid = 'QmFallbackLocalCID' + Date.now()
    }
    await runPredict({ message: text }, contentCid, vault, text, 'message', 'message')
    setRunning(null)
  }

  async function checkFile(file, filetype) {
    begin('file')
    step(1, 'Creating a fingerprint of the file…')
    step(2, 'Storing the file in the evidence vault…')
    let contentCid
    let vault = null
    try {
      const { data } = await api.uploadFile(file, clientName())
      if (!data?.status) throw new Error(data?.message || data?.error || 'upload rejected')
      contentCid = data.cid
      vault = { cid: data.cid, link: data.url || evidenceUrl(data.cid) }
    } catch (err) {
      console.error('Error uploading file:', err)
      contentCid = 'QmLocalFileVault' + Date.now()
    }
    await runPredict({ file }, contentCid, vault, `File: ${file.name}`, filetype, 'file')
    setRunning(null)
  }

  // Chat history: vault the transcript, run all five layers over the whole conversation.
  // Resolves to an error message for the form, or null.
  async function analyzeChat({ chatText, me, parsed, fileName }) {
    begin('chat')
    step(1, 'Creating a fingerprint of the chat…')
    // excerpt for CERT-Army / Gemini: most recent messages, labelled by sender
    const excerpt = parsed.messages
      .slice(-40)
      .map((m) => `${m.sender === me ? `${m.sender} (reporter)` : m.sender}: ${m.text}`)
      .join('\n')
      .slice(-3500)
    const evidenceText = `Chat history (${parsed.messages.length} messages${fileName ? `, ${fileName}` : ''}):\n${excerpt}`
    let contentCid = null
    let vault = null
    try {
      step(2, 'Storing the chat in the evidence vault…')
      const { data } = await api.uploadText(chatText, clientName())
      if (data?.status) {
        contentCid = data.cid
        vault = { cid: data.cid, link: data.url || evidenceUrl(data.cid) }
      }
    } catch (err) {
      console.error('Chat IPFS upload failed:', err)
    }
    try {
      step(3, 'Checking the whole conversation with the AI engine…')
      const { status, data } = await api.analyzeConversation(chatText, me)
      if (!data?.status) throw new Error(data?.error || `The AI engine returned HTTP ${status}.`)
      await finishAnalysis(data.fused, contentCid, evidenceText, 'chat_history', vault)
      complete(Boolean(contentCid))
      return null
    } catch (err) {
      console.error('Conversation analysis error:', err)
      setCurrentStage('')
      setPipelineStep(0)
      return `Analysis failed. ${describeError(err)}`
    } finally {
      setRunning(null)
    }
  }

  const busy = running !== null
  const showSkeleton = busy && !reportFresh

  return (
    <PageShell title="Check" header={<SiteHeader links={LINKS} />}>
      <PageHeading
        title="Check Something Suspicious"
        description={
          <>
            Paste a message, upload a chat history or add a file. You’ll get a risk score out of 100 and clear next steps.
            {displayName && (
              <span className="mt-1 block text-sm">
                Signed in as <span className="text-foreground">{displayName}</span>
              </span>
            )}
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4 grid h-9! w-full grid-cols-3">
                <TabsTrigger value="message">
                  <MessageSquareText aria-hidden className="hidden sm:block" />
                  Message
                </TabsTrigger>
                <TabsTrigger value="chat">
                  <MessagesSquare aria-hidden className="hidden sm:block" />
                  Chat History
                </TabsTrigger>
                <TabsTrigger value="file">
                  <FileUp aria-hidden className="hidden sm:block" />
                  File
                </TabsTrigger>
              </TabsList>
              {/* forceMount keeps each form's input when switching tabs, like the old page */}
              <TabsContent value="message" forceMount className="data-[state=inactive]:hidden">
                <MessageForm onSubmit={checkMessage} pending={running === 'message'} busy={busy} />
              </TabsContent>
              <TabsContent value="chat" forceMount className="data-[state=inactive]:hidden">
                <ChatHistoryForm onAnalyze={analyzeChat} pending={running === 'chat'} busy={busy} />
              </TabsContent>
              <TabsContent value="file" forceMount className="data-[state=inactive]:hidden">
                <FileForm onSubmit={checkFile} pending={running === 'file'} busy={busy} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <section ref={resultRef} aria-label="Result" className="min-w-0 scroll-mt-20 space-y-4">
          {busy && <PipelineProgress step={pipelineStep} stage={currentStage} />}

          {!busy && currentStage && (
            <p className="text-muted-foreground text-sm" role="status">
              {currentStage}
            </p>
          )}

          {aiError && !busy && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>{aiError.title}</AlertTitle>
              <AlertDescription>{aiError.description}</AlertDescription>
            </Alert>
          )}

          {showSkeleton ? (
            <ResultSkeleton />
          ) : report ? (
            <ResultCard
              report={report}
              mitigationSource={mitigationSource}
              escalation={escalation}
              countdown={countdown}
              onCancelCountdown={() => setCountdown(null)}
              cid={evidence?.cid}
              cidLink={evidence?.link}
              onUseChatTab={() => setTab('chat')}
            />
          ) : (
            !busy && <NothingYet />
          )}
        </section>
      </div>
    </PageShell>
  )
}
