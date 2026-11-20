import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Verification from './pages/Verification'
import Opportunities from './pages/Opportunities'
import Matching from './pages/Matching'
import Mentorship from './pages/Mentorship'
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
              <Verification />
            </RequireRole>
          }
        />
        <Route
          path="/matching"
          element={
            <RequireRole allow={ROUTE_ACCESS['/matching']}>
              <Matching />
            </RequireRole>
          }
        />
        <Route
          path="/mentorship"
          element={
            <RequireRole allow={ROUTE_ACCESS['/mentorship']}>
              <Mentorship />
            </RequireRole>
          }
        />
        <Route
          path="/opportunities"
          element={
            <RequireRole allow={ROUTE_ACCESS['/opportunities']}>
              <Opportunities />
            </RequireRole>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
