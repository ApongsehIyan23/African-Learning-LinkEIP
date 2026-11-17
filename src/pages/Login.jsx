import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'

export default function Login() {
  const { session, loading, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  if (loading) return <Spinner label="Checking your session…" />
  // Already signed in → let the app route you to your role's home.
  if (session) return <Navigate to="/" replace />

  async function onSubmit(e) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setStatus('sending')
    setError('')
    const { error: err } = await signInWithEmail(trimmed)
    if (err) {
      setStatus('error')
      setError(err.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          African Learning Link
        </p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Sign in</h1>

        {status === 'sent' ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-medium">Check your email</p>
            <p className="mt-1">
              We sent a magic link to <span className="font-semibold">{email.trim()}</span>.
              Open it on this device to finish signing in.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus('idle')
                setEmail('')
              }}
              className="mt-3 text-emerald-700 underline hover:text-emerald-900"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {status === 'error' && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error || 'Something went wrong. Please try again.'}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending link…' : 'Send magic link'}
            </button>

            <p className="text-center text-xs text-slate-500">
              No password needed. We’ll email you a secure sign-in link.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
