import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'

// Each page is its own chunk: visitors download only the page they open.
const Home = lazy(() => import('@/pages/home'))
const Auth = lazy(() => import('@/pages/auth'))
const Dashboard = lazy(() => import('@/pages/dashboard'))
const Guidance = lazy(() => import('@/pages/guidance'))
const Official = lazy(() => import('@/pages/official'))
const HowItWorks = lazy(() => import('@/pages/how-it-works'))
const NotFound = lazy(() => import('@/pages/not-found'))

function PageFallback() {
  return (
    <div className="text-muted-foreground flex min-h-svh items-center justify-center gap-2 text-sm" role="status">
      <Spinner /> Loading…
    </div>
  )
}

// Routes are unchanged from the original app; /workflow and /explainer now share one page.
export default function App() {
  return (
    <Router>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/upload" element={<Dashboard />} />
          <Route path="/chat" element={<Guidance />} />
          <Route path="/officialpage" element={<Official />} />
          <Route path="/workflow" element={<HowItWorks />} />
          <Route path="/explainer" element={<HowItWorks />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
