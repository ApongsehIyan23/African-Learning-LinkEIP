import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import OpportunityForm from '../components/OpportunityForm'
import OpportunityDrawer from '../components/OpportunityDrawer'
import Spinner from '../components/Spinner'
import {
  listOpportunities,
  createOpportunity,
  STATUS_ORDER,
  STATUS_LABEL,
  TYPE_LABEL,
} from '../lib/opportunities'

function who(u) {
  return u?.full_name || u?.email || '—'
}

export default function Verification() {
  const { role, user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [openId, setOpenId] = useState(null)

  const canCreate = role === 'submitter' || role === 'super_admin'

  async function refresh() {
    setLoading(true)
    try {
      setItems(await listOpportunities())
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const counts = useMemo(() => {
    const c = { all: items.length }
    for (const s of STATUS_ORDER) c[s] = 0
    for (const it of items) c[it.current_status] = (c[it.current_status] ?? 0) + 1
    return c
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      if (statusFilter !== 'all' && it.current_status !== statusFilter) return false
      if (!q) return true
      return (
        it.title.toLowerCase().includes(q) ||
        it.provider.toLowerCase().includes(q)
      )
    })
  }, [items, search, statusFilter])

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Verification Queue</h1>
          <p className="mt-1 text-sm text-slate-600">
            Opportunities move through eight states; staff run the six criteria and the two-step publish gate.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Log opportunity
          </button>
        )}
      </div>

      {/* Search + status filters */}
      <div className="mt-5 space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or provider…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label={`All (${counts.all})`} />
          {STATUS_ORDER.map((s) => (
            <Chip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={`${STATUS_LABEL[s]} (${counts[s] ?? 0})`}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No opportunities{statusFilter !== 'all' ? ' in this status' : ''}.
          {canCreate && statusFilter === 'all' && ' Click “Log opportunity” to add one.'}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-5 hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Deadline</th>
                  <th className="px-4 py-3 font-semibold">Submitted by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((it) => (
                  <tr key={it.id} onClick={() => setOpenId(it.id)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{it.title}</div>
                      <div className="text-xs text-slate-500">{it.provider}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[it.type]}</td>
                    <td className="px-4 py-3"><StatusBadge status={it.current_status} /></td>
                    <td className="px-4 py-3 text-slate-600">{it.deadline || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{who(it.submitter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-5 space-y-3 md:hidden">
            {filtered.map((it) => (
              <button
                key={it.id}
                onClick={() => setOpenId(it.id)}
                className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">{it.title}</div>
                    <div className="text-xs text-slate-500">{it.provider} · {TYPE_LABEL[it.type]}</div>
                  </div>
                  <StatusBadge status={it.current_status} />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Deadline: {it.deadline || '—'} · By {who(it.submitter)}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <OpportunityForm
          onClose={() => setShowForm(false)}
          onSubmit={async (fields) => {
            await createOpportunity(fields, user.id)
            setShowForm(false)
            await refresh()
          }}
        />
      )}

      {openId && (
        <OpportunityDrawer
          oppId={openId}
          role={role}
          userId={user.id}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  )
}

function Chip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  )
}
