import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import OpportunityForm from '../components/OpportunityForm'
import OpportunityDrawer from '../components/OpportunityDrawer'
import AiDiscovery from '../components/AiDiscovery'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Card from '../components/ui/Card'
import { SkeletonRows } from '../components/ui/Skeleton'
import {
  listOpportunities,
  createOpportunity,
  STATUS_ORDER,
  STATUS_LABEL,
  TYPE_LABEL,
} from '../lib/opportunities'
import { isStaffRole } from '../lib/roles'

function who(u) {
  return u?.full_name || u?.email || '—'
}

// What, if anything, this item needs from the current user right now.
function attentionFor(it, role, userId) {
  const s = it.current_status
  const staff = isStaffRole(role) && role !== 'submitter'
  if (role === 'super_admin' && s === 'approved_for_publication')
    return 'Awaiting your publish sign-off'
  if (staff && s === 'received') return 'Ready to start review'
  if (staff && s === 'under_review') return 'Run the six criteria'
  if (staff && s === 'verification_in_progress') return 'Decide approval'
  if (staff && s === 'awaiting_information') return 'On hold — awaiting information'
  if (it.submitted_by === userId && s === 'awaiting_information')
    return 'Action needed: provide requested info'
  return null
}

export default function Verification() {
  const { role, user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [notice, setNotice] = useState('')
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

  const attention = useMemo(() => {
    return items
      .map((it) => ({ it, reason: attentionFor(it, role, user?.id) }))
      .filter((x) => x.reason)
      .slice(0, 8)
  }, [items, role, user?.id])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      if (statusFilter !== 'all' && it.current_status !== statusFilter) return false
      if (!q) return true
      return (
        it.title.toLowerCase().includes(q) || it.provider.toLowerCase().includes(q)
      )
    })
  }, [items, search, statusFilter])

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Verification Queue</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Opportunities move through eight states; staff run the six criteria and the two-step
            publish gate.
          </p>
        </div>
        {canCreate && (
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" icon="sparkles" onClick={() => setShowAi(true)}>
              Find with AI
            </Button>
            <Button icon="plus" onClick={() => setShowForm(true)}>
              Log opportunity
            </Button>
          </div>
        )}
      </div>

      {notice && (
        <p className="mt-4 rounded-btn border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-btn border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">
          {error}
        </p>
      )}

      {/* Main + attention rail */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---- main column ---- */}
        <div className="min-w-0">
          {/* Search */}
          <div className="relative max-w-sm">
            <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or provider…"
              className="field pl-10"
              aria-label="Search opportunities"
            />
          </div>

          {/* Status filter chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="All" count={counts.all} />
            {STATUS_ORDER.map((s) => (
              <Chip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                label={STATUS_LABEL[s]}
                count={counts[s] ?? 0}
              />
            ))}
          </div>

          {loading ? (
            <div className="mt-5">
              <SkeletonRows rows={5} />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState canCreate={canCreate} filtered={statusFilter !== 'all'} onCreate={() => setShowForm(true)} />
          ) : (
            <>
              {/* Desktop / tablet table */}
              <Card padded={false} className="mt-5 hidden overflow-hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                    <tr>
                      <th className="px-4 py-3">Opportunity</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Deadline</th>
                      <th className="hidden px-4 py-3 lg:table-cell">Submitted by</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 sr-only">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((it) => (
                      <tr
                        key={it.id}
                        onClick={() => setOpenId(it.id)}
                        className="group cursor-pointer transition-colors hover:bg-surface-2"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink">{it.title}</div>
                          <div className="text-xs text-ink-subtle">{it.provider}</div>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{TYPE_LABEL[it.type]}</td>
                        <td className="px-4 py-3 text-ink-muted tnum">{it.deadline || '—'}</td>
                        <td className="hidden px-4 py-3 text-ink-muted lg:table-cell">{who(it.submitter)}</td>
                        <td className="px-4 py-3"><StatusBadge status={it.current_status} /></td>
                        <td className="px-2 py-3 text-right">
                          <Icon name="chevronRight" size={18} className="text-ink-subtle transition-transform group-hover:translate-x-0.5" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Mobile cards */}
              <div className="mt-5 space-y-3 md:hidden">
                {filtered.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => setOpenId(it.id)}
                    className="focus-ring block w-full rounded-card border border-border bg-surface p-4 text-left shadow-card transition-colors hover:bg-surface-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{it.title}</div>
                        <div className="text-xs text-ink-subtle">
                          {it.provider} · {TYPE_LABEL[it.type]}
                        </div>
                      </div>
                      <StatusBadge status={it.current_status} size="sm" />
                    </div>
                    <div className="mt-2 text-xs text-ink-subtle">
                      Deadline: {it.deadline || '—'} · By {who(it.submitter)}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ---- attention rail ---- */}
        <aside className="xl:pt-0">
          <AttentionRail
            loading={loading}
            items={attention}
            onOpen={(id) => setOpenId(id)}
          />
        </aside>
      </div>

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

      {showAi && (
        <AiDiscovery
          userId={user.id}
          onClose={() => setShowAi(false)}
          onConfirmed={async (count) => {
            setShowAi(false)
            setNotice(
              `${count} AI-sourced opportunit${count === 1 ? 'y' : 'ies'} added to the queue at Received.`,
            )
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

function AttentionRail({ loading, items, onOpen }) {
  return (
    <Card className="xl:sticky xl:top-6">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Icon name="bell" size={15} />
        </span>
        <h2 className="text-sm font-semibold text-ink">Needs your attention</h2>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-ink-subtle">
          You’re all caught up — nothing is waiting on you.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map(({ it, reason }) => (
            <li key={it.id}>
              <button
                onClick={() => onOpen(it.id)}
                className="focus-ring group block w-full rounded-btn border border-border p-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium text-ink">{it.title}</span>
                  <Icon name="arrowUpRight" size={15} className="shrink-0 text-ink-subtle group-hover:text-brand-700" />
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={it.current_status} size="sm" />
                </div>
                <p className="mt-1.5 text-xs text-ink-muted">{reason}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function EmptyState({ canCreate, filtered, onCreate }) {
  return (
    <div className="mt-6 rounded-card border border-dashed border-border-strong bg-surface p-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-subtle">
        <Icon name="inbox" size={22} />
      </span>
      <p className="mt-3 text-sm font-medium text-ink">
        No opportunities{filtered ? ' in this status' : ' yet'}.
      </p>
      {canCreate && !filtered && (
        <>
          <p className="mt-1 text-sm text-ink-subtle">Log the first one to start the queue.</p>
          <div className="mt-4">
            <Button icon="plus" onClick={onCreate}>Log opportunity</Button>
          </div>
        </>
      )}
    </div>
  )
}

function Chip({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-border bg-surface text-ink-muted hover:bg-surface-2 hover:text-ink'
      }`}
    >
      {label}
      <span
        className={`tnum rounded-full px-1.5 text-[11px] font-semibold ${
          active ? 'bg-white/20 text-white' : 'bg-surface-2 text-ink-subtle'
        }`}
      >
        {count}
      </span>
    </button>
  )
}
