import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { checkSupabaseConnection } from '../lib/supabaseClient'

function StatusBadge({ state }) {
  const map = {
    checking: { text: 'Checking…', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    ok: { text: 'Connected', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    fail: { text: 'Not connected', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
  }
  const s = map[state] ?? map.checking
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${s.cls}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {s.text}
    </span>
  )
}

export default function Home() {
  const [state, setState] = useState('checking')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    let active = true
    checkSupabaseConnection().then((res) => {
      if (!active) return
      setState(res.ok ? 'ok' : 'fail')
      setDetail(res.ok ? `Supabase reachable (HTTP ${res.status}).` : res.reason)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Phase 0 · Foundation
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          African Learning Link
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
          A pan-African e-learning and mentorship platform. Sign in to reach your
          workspace — opportunities for students, the verification queue for staff.
        </p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-block rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Supabase connection</h2>
            <p className="mt-1 text-sm text-slate-600">{detail || 'Testing the backend link…'}</p>
          </div>
          <StatusBadge state={state} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { k: 'Front-end', v: 'React + Vite + Tailwind CSS' },
          { k: 'Routing', v: 'React Router' },
          { k: 'Backend', v: 'Supabase (Auth, Postgres, RLS, Realtime)' },
          { k: 'Deploy', v: 'GitHub → Vercel' },
        ].map((row) => (
          <div key={row.k} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{row.k}</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{row.v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
