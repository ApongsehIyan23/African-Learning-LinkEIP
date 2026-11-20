import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRealtime } from '../hooks/useRealtime'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Card from '../components/ui/Card'
import { SkeletonRows } from '../components/ui/Skeleton'
import { listPublishedOpportunities, TYPE_LABEL, TYPE_OPTIONS } from '../lib/opportunities'

function fmtDate(d) {
  if (!d) return null
  const date = new Date(d + 'T00:00:00')
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Days until a deadline (null if none / unparseable).
function daysLeft(d) {
  if (!d) return null
  const date = new Date(d + 'T23:59:59')
  if (isNaN(date.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((date - today) / 86400000)
}

function DeadlinePill({ deadline }) {
  const left = daysLeft(deadline)
  if (!deadline) {
    return <span className="text-xs text-ink-subtle">No deadline stated</span>
  }
  let cls = 'bg-slate-100 text-slate-600 border-slate-200'
  let label = fmtDate(deadline)
  if (left != null) {
    if (left < 0) {
      cls = 'bg-slate-200 text-slate-600 border-slate-300'
      label = `Closed · ${fmtDate(deadline)}`
    } else if (left <= 7) {
      cls = 'bg-warning-50 text-warning-700 border-warning-100'
      label = left === 0 ? 'Closes today' : `${left} day${left === 1 ? '' : 's'} left`
    } else {
      cls = 'bg-success-50 text-success-700 border-success-100'
      label = `Closes ${fmtDate(deadline)}`
    }
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <Icon name="clock" size={12} strokeWidth={2.25} />
      {label}
    </span>
  )
}

function TypeBadge({ type }) {
  return (
    <span className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800">
      {TYPE_LABEL[type] ?? type}
    </span>
  )
}

export default function Opportunities() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [geo, setGeo] = useState('')
  const [openItem, setOpenItem] = useState(null)

  const load = useCallback(async () => {
    try {
      setItems(await listPublishedOpportunities())
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Live: a newly published opportunity appears here without a refresh (RLS keeps
  // the stream to published rows only).
  useRealtime(['opportunities'], load)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const g = geo.trim().toLowerCase()
    return items.filter((it) => {
      if (typeFilter !== 'all' && it.type !== typeFilter) return false
      if (g && !(it.geo_restrictions ?? '').toLowerCase().includes(g)) return false
      if (!q) return true
      return [it.title, it.provider, it.summary, it.eligibility]
        .some((f) => (f ?? '').toLowerCase().includes(q))
    })
  }, [items, search, typeFilter, geo])

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Opportunities</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Verified scholarships, courses, internships, jobs and fellowships, published by the African
          Learning Link team.
        </p>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_200px]">
        <div className="relative">
          <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, provider, or field…"
            className="field pl-10"
            aria-label="Search opportunities"
          />
        </div>
        <select className="field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{TYPE_LABEL[t]}</option>
          ))}
        </select>
        <input
          value={geo}
          onChange={(e) => setGeo(e.target.value)}
          placeholder="Location — e.g. Nigeria"
          className="field"
          aria-label="Filter by location"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-btn border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">{error}</p>
      )}

      {loading ? (
        <div className="mt-6">
          <SkeletonRows rows={4} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-border-strong bg-surface p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-subtle">
            <Icon name="compass" size={22} />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">
            {items.length === 0 ? 'No opportunities published yet.' : 'Nothing matches your filters.'}
          </p>
          <p className="mt-1 text-sm text-ink-subtle">
            {items.length === 0 ? 'Check back soon — new opportunities are added regularly.' : 'Try a broader search or clear a filter.'}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-xs text-ink-subtle">
            {filtered.length} opportunit{filtered.length === 1 ? 'y' : 'ies'}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((it) => (
              <OpportunityCard key={it.id} it={it} onOpen={() => setOpenItem(it)} />
            ))}
          </div>
        </>
      )}

      {openItem && <OpportunityDetail it={openItem} onClose={() => setOpenItem(null)} />}
    </div>
  )
}

function OpportunityCard({ it, onOpen }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <TypeBadge type={it.type} />
        <DeadlinePill deadline={it.deadline} />
      </div>
      <button onClick={onOpen} className="focus-ring mt-3 rounded text-left">
        <h2 className="font-semibold leading-snug text-ink hover:text-brand-700">{it.title}</h2>
      </button>
      <p className="mt-0.5 text-xs text-ink-subtle">{it.provider}</p>
      {it.summary && <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{it.summary}</p>}
      {it.geo_restrictions && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink-subtle">
          <Icon name="globe" size={13} /> {it.geo_restrictions}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <Button variant="secondary" size="sm" onClick={onOpen}>Details</Button>
        {it.application_link && (
          <Button as="a" href={it.application_link} target="_blank" rel="noreferrer" size="sm" iconRight="arrowUpRight" className="ml-auto">
            Apply
          </Button>
        )}
      </div>
    </Card>
  )
}

function OpportunityDetail({ it, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={it.type} />
              <DeadlinePill deadline={it.deadline} />
            </div>
            <h2 className="mt-2 text-lg font-semibold text-ink">{it.title}</h2>
            <p className="text-sm text-ink-subtle">{it.provider}</p>
          </div>
          <button onClick={onClose} className="focus-ring rounded-btn p-1 text-ink-subtle hover:bg-surface-2 hover:text-ink" aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {it.summary && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Summary</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-ink">{it.summary}</p>
            </section>
          )}
          {it.eligibility && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Who can apply</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-ink">{it.eligibility}</p>
            </section>
          )}
          {it.geo_restrictions && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Location</h3>
              <p className="mt-1 text-sm text-ink">{it.geo_restrictions}</p>
            </section>
          )}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Deadline</h3>
            <p className="mt-1 text-sm text-ink">{fmtDate(it.deadline) ?? 'Not stated'}</p>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {it.application_link && (
            <Button as="a" href={it.application_link} target="_blank" rel="noreferrer" iconRight="arrowUpRight">
              Apply now
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
