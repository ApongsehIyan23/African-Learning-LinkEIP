import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Card from '../components/ui/Card'
import Icon from '../components/ui/Icon'
import { SkeletonRows } from '../components/ui/Skeleton'
import { useRealtime } from '../hooks/useRealtime'
import { STATUS_ORDER, STATUS_LABEL } from '../lib/opportunities'

const ACTIVE_QUEUE = ['received', 'under_review', 'verification_in_progress', 'awaiting_information']

function daysBetween(a, b) {
  const d1 = new Date(a), d2 = new Date(b)
  if (isNaN(d1) || isNaN(d2)) return null
  return (d2 - d1) / 86400000
}

export default function Dashboard() {
  const [opps, setOpps] = useState([])
  const [matches, setMatches] = useState([])
  const [mentors, setMentors] = useState([])
  const [mentees, setMentees] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pulse, setPulse] = useState(false)

  const load = useCallback(async (isLive = false) => {
    try {
      const [o, m, mo, me, act] = await Promise.all([
        supabase.from('opportunities').select('current_status, date_received, publication_date, created_at'),
        supabase.from('matches').select('status'),
        supabase.from('mentor_profiles').select('verified, status'),
        supabase.from('mentee_profiles').select('status'),
        supabase
          .from('opportunity_activity')
          .select('id, action, note, created_at, actor:users!opportunity_activity_actor_id_fkey(full_name, email), opp:opportunities(title)')
          .order('created_at', { ascending: false })
          .limit(8),
      ])
      for (const r of [o, m, mo, me, act]) if (r.error) throw r.error
      setOpps(o.data ?? []); setMatches(m.data ?? []); setMentors(mo.data ?? [])
      setMentees(me.data ?? []); setActivity(act.data ?? [])
      setError('')
      if (isLive) { setPulse(true); setTimeout(() => setPulse(false), 900) }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useRealtime(['opportunities', 'matches', 'mentor_profiles', 'mentee_profiles'], () => load(true))

  const m = useMemo(() => {
    const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]))
    for (const o of opps) byStatus[o.current_status] = (byStatus[o.current_status] ?? 0) + 1
    const inQueue = ACTIVE_QUEUE.reduce((a, s) => a + (byStatus[s] ?? 0), 0)
    const turns = opps
      .filter((o) => o.current_status === 'published' && o.publication_date)
      .map((o) => daysBetween(o.date_received ?? o.created_at, o.publication_date))
      .filter((d) => d != null && d >= 0)
    const avgTurn = turns.length ? turns.reduce((a, b) => a + b, 0) / turns.length : null
    return {
      byStatus,
      inQueue,
      awaiting: byStatus.approved_for_publication ?? 0,
      published: byStatus.published ?? 0,
      onHold: byStatus.awaiting_information ?? 0,
      avgTurn,
      activeMatches: matches.filter((x) => x.status === 'connected' || x.status === 'active').length,
      pendingMentors: mentors.filter((x) => !x.verified).length,
      mentorsTotal: mentors.length,
      menteesTotal: mentees.length,
    }
  }, [opps, matches, mentors, mentees])

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">Live operational metrics across verification and mentorship.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${pulse ? 'border-success-100 bg-success-50 text-success-700' : 'border-border bg-surface text-ink-subtle'}`}>
          <span className={`h-2 w-2 rounded-full ${pulse ? 'bg-success-600' : 'bg-success-600/70'}`} />
          Live
        </span>
      </div>

      {error && <p className="mt-4 rounded-btn border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">{error}</p>}

      {loading ? (
        <div className="mt-6"><SkeletonRows rows={5} /></div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon="inbox" label="In queue" value={m.inQueue} hint="Awaiting staff action" />
            <Kpi icon="badgeCheck" label="Awaiting sign-off" value={m.awaiting} hint="Approved, not yet published" />
            <Kpi icon="globe" label="Published" value={m.published} hint="Live to students" tone="success" />
            <Kpi icon="clock" label="Avg. verification turnaround" value={m.avgTurn != null ? `${m.avgTurn.toFixed(1)}d` : '—'} hint="Received → published" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Pipeline breakdown */}
            <Card>
              <h2 className="text-sm font-semibold text-ink">Opportunity pipeline</h2>
              <ul className="mt-3 space-y-2">
                {STATUS_ORDER.map((s) => {
                  const count = m.byStatus[s] ?? 0
                  const pct = opps.length ? Math.round((count / opps.length) * 100) : 0
                  return (
                    <li key={s}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-muted">{STATUS_LABEL[s]}</span>
                        <span className="tnum font-medium text-ink">{count}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>

            {/* Mentorship stats */}
            <Card>
              <h2 className="text-sm font-semibold text-ink">Mentorship</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Mini icon="users" label="Mentees" value={m.menteesTotal} />
                <Mini icon="userPlus" label="Mentors" value={m.mentorsTotal} />
                <Mini icon="shieldCheck" label="Pending verification" value={m.pendingMentors} tone={m.pendingMentors ? 'warning' : 'default'} />
                <Mini icon="check" label="Active matches" value={m.activeMatches} tone="success" />
              </div>
              <p className="mt-3 text-xs text-ink-subtle">
                {m.pendingMentors > 0
                  ? `${m.pendingMentors} mentor${m.pendingMentors === 1 ? '' : 's'} awaiting verification before matching.`
                  : 'All registered mentors are verified.'}
              </p>
            </Card>
          </div>

          {/* Recent activity */}
          <Card className="mt-4">
            <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
            {activity.length === 0 ? (
              <p className="mt-3 text-sm text-ink-subtle">No activity yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-ink">
                        <span className="font-medium capitalize">{String(a.action).replace(/_/g, ' ')}</span>
                        {a.opp?.title ? <span className="text-ink-muted"> · {a.opp.title}</span> : null}
                      </p>
                      {a.note && <p className="truncate text-xs text-ink-subtle">{a.note}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-ink-subtle">{new Date(a.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function Kpi({ icon, label, value, hint, tone = 'default' }) {
  const toneCls = tone === 'success' ? 'bg-success-50 text-success-700' : 'bg-brand-50 text-brand-700'
  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneCls}`}>
          <Icon name={icon} size={17} />
        </span>
        <span className="text-xs font-medium text-ink-muted">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink tnum">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>}
    </Card>
  )
}

function Mini({ icon, label, value, tone = 'default' }) {
  const toneCls =
    tone === 'success' ? 'text-success-700' : tone === 'warning' ? 'text-warning-700' : 'text-ink'
  return (
    <div className="rounded-btn border border-border p-3">
      <div className="flex items-center gap-1.5 text-ink-subtle">
        <Icon name={icon} size={15} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-semibold tnum ${toneCls}`}>{value}</p>
    </div>
  )
}
