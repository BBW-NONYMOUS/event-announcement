import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider } from './components/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RequireAdmin } from './components/RequireAdmin'
import { PageShell } from './components/layout/PageShell'
import { Login } from './pages/Login'

// Split per route: Recharts (Dashboard) and the QR scanner are heavy, and an
// operator on the check-in desk should not pay to download the chart library.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const EventsManager = lazy(() =>
  import('./pages/EventsManager').then((m) => ({ default: m.EventsManager })),
)
const CheckInScanner = lazy(() =>
  import('./pages/CheckInScanner').then((m) => ({ default: m.CheckInScanner })),
)
const Announcements = lazy(() =>
  import('./pages/Announcements').then((m) => ({ default: m.Announcements })),
)
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })))

function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status">
      <span className="sr-only">Loading page…</span>
      <Loader2 aria-hidden="true" className="size-5 animate-spin text-slate-300" />
    </div>
  )
}

/** Each route gets its own boundary so one page's crash can't take out the
 *  shell, and its own Suspense so navigation shows a spinner, not a blank. */
function Page({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAdmin>
                <PageShell />
              </RequireAdmin>
            }
          >
            <Route
              index
              element={
                <Page>
                  <Dashboard />
                </Page>
              }
            />
            <Route
              path="events"
              element={
                <Page>
                  <EventsManager />
                </Page>
              }
            />
            <Route
              path="checkin"
              element={
                <Page>
                  <CheckInScanner />
                </Page>
              }
            />
            <Route
              path="announcements"
              element={
                <Page>
                  <Announcements />
                </Page>
              }
            />
            <Route
              path="settings"
              element={
                <Page>
                  <Settings />
                </Page>
              }
            />
            <Route
              path="404"
              element={
                <Page>
                  <NotFound />
                </Page>
              }
            />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
