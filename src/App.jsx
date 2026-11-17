import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Placeholder from './pages/Placeholder'
import NotFound from './pages/NotFound'
import Spinner from './components/Spinner'
import { RequireRole } from './components/RouteGuards'
import { useAuth } from './context/AuthContext'
import { ROUTE_ACCESS, homeForRole } from './lib/roles'

// "/" — public landing for guests; role-based redirect for signed-in users.
function RootRedirect() {
  const { session, role, loading } = useAuth()
  if (loading) return <Spinner label="Loading…" />
  if (!session) return <Home />
  if (role) return <Navigate to={homeForRole(role)} replace />
  return <Spinner label="Loading your profile…" />
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <RequireRole allow={ROUTE_ACCESS['/dashboard']}>
              <Placeholder
                title="Dashboard"
                description="Staff admin console. Live metrics and queue counters arrive in Phase 5."
              />
            </RequireRole>
          }
        />
        <Route
          path="/verification"
          element={
            <RequireRole allow={ROUTE_ACCESS['/verification']}>
              <Placeholder
                title="Verification Queue"
                description="The opportunity lifecycle — eight states, six criteria, and the two-step publish gate. Built in Phase 2."
              />
            </RequireRole>
          }
        />
        <Route
          path="/matching"
          element={
            <RequireRole allow={ROUTE_ACCESS['/matching']}>
              <Placeholder
                title="Mentor Matching"
                description="Profiles, weighted six-criteria scoring, and the accept / decline / confirm flow. Built in Phase 4."
              />
            </RequireRole>
          }
        />
        <Route
          path="/opportunities"
          element={
            <RequireRole allow={ROUTE_ACCESS['/opportunities']}>
              <Placeholder
                title="Opportunities"
                description="The student-facing listing of published opportunities, with search and filtering. Built in Phase 3."
              />
            </RequireRole>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
