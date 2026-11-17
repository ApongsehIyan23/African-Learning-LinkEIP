import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'
import Forbidden from '../pages/Forbidden'

/** Requires an authenticated session. */
export function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <Spinner label="Checking your session…" />
  if (!session) return <Navigate to="/login" replace />
  return children
}

/** Requires an authenticated session whose role is in `allow`. */
export function RequireRole({ allow, children }) {
  const { session, role, profile, loading } = useAuth()

  if (loading) return <Spinner label="Checking your session…" />
  if (!session) return <Navigate to="/login" replace />

  // Session exists but the profile row could not be loaded.
  if (!profile) {
    return (
      <section className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-semibold">Finishing account setup…</h1>
        <p className="mt-2 text-sm text-slate-600">
          We couldn’t load your profile yet. This is usually momentary on a brand-new
          account.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Reload
        </button>
      </section>
    )
  }

  if (!allow.includes(role)) return <Forbidden />
  return children
}
