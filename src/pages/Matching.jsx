import { useEffect, useMemo, useState } from 'react'
import { useRealtime } from '../hooks/useRealtime'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Card from '../components/ui/Card'
import { SkeletonRows } from '../components/ui/Skeleton'
import ScoreBreakdown from '../components/matching/ScoreBreakdown'
import {
  listMentors,
  listMentees,
  listMatches,
  verifyMentor,
  recommendMatch,
  scoreMentor,
  MENTOR_COMPLETE,
  MATCHING_STATUS_LABEL,
  MATCHING_STATUS_BADGE,
  MATCH_STATUS_LABEL,
} from '../lib/matching'

const MATCH_BADGE = {
  recommended: 'bg-brand-100 text-brand-700 border-brand-200',
  declined: 'bg-slate-200 text-slate-600 border-slate-300',
  connected: 'bg-brand-50 text-brand-800 border-brand-100',
  active: 'bg-success-50 text-success-700 border-success-100',
}
const who = (p) => p?.user?.full_name || p?.user?.email || '—'

function MStatus({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${MATCHING_STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {MATCHING_STATUS_LABEL[status] ?? status}
    </span>
  )
}

const TABS = [
  { key: 'mentees', label: 'Mentees' },
  { key: 'mentors', label: 'Mentors' },
  { key: 'matches', label: 'Matches' },
]

export default function Matching() {
  const [tab, setTab] = useState('mentees')
  const [mentors, setMentors] = useState([])
  const [mentees, setMentees] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recommendFor, setRecommendFor] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [mo, me, ma] = await Promise.all([listMentors(), listMentees(), listMatches()])
      setMentors(mo); setMentees(me); setMatches(ma); setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])
  useRealtime(['matches', 'mentor_profiles', 'mentee_profiles'], () => load())

  const verifiedMentors = useMemo(() => mentors.filter((m) => m.verified && MENTOR_COMPLETE(m)), [mentors])

  async function act(fn, msg) {
    try { await fn(); setNotice(msg); await load() } catch (e) { setError(e.message) }
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Mentor Matching</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Verify mentors, generate ranked recommendations on the six weighted criteria, and monitor matches.
        </p>
      </div>

      {error && <p className="mt-4 rounded-btn border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">{error}</p>}
      {notice && <p className="mt-4 rounded-btn border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700">{notice}</p>}

      <div className="mt-5 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-muted hover:text-ink'}`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-ink-subtle">
              {t.key === 'mentees' ? mentees.length : t.key === 'mentors' ? mentors.length : matches.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6"><SkeletonRows rows={4} /></div>
      ) : (
        <div className="mt-6">
          {tab === 'mentees' && (
            <List
              items={mentees}
              empty="No mentees have registered yet."
              render={(p) => (
                <ProfileRow
                  key={p.id}
                  p={p}
                  right={
                    ['ready_to_match', 'searching', 'declined'].includes(p.status) ? (
                      <Button size="sm" icon="userPlus" onClick={() => setRecommendFor(p)}>Find mentor</Button>
                    ) : (
                      <span className="text-xs text-ink-subtle">
                        {p.status === 'profile_incomplete' ? 'Profile incomplete' : 'In a match'}
                      </span>
                    )
                  }
                />
              )}
            />
          )}

          {tab === 'mentors' && (
            <List
              items={mentors}
              empty="No mentors have registered yet."
              render={(p) => (
                <ProfileRow
                  key={p.id}
                  p={p}
                  extra={`Capacity ${p.capacity}`}
                  right={
                    p.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-success-100 bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">
                        <Icon name="shieldCheck" size={12} /> Verified
                      </span>
                    ) : (
                      <Button size="sm" icon="shieldCheck" onClick={() => act(() => verifyMentor(p.id), 'Mentor verified.')}>Verify</Button>
                    )
                  }
                />
              )}
            />
          )}

          {tab === 'matches' && (
            <List
              items={matches}
              empty="No matches yet."
              render={(m) => (
                <Card key={m.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {who(m.mentee)} <span className="text-ink-subtle">→</span> {who(m.mentor)}
                    </p>
                    <p className="text-xs text-ink-subtle">
                      {new Date(m.recommended_at).toLocaleDateString()}
                      {m.mentee?.field ? ` · ${m.mentee.field}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.match_score != null && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800 tnum">
                        {Math.round(Number(m.match_score) * 100)}%
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${MATCH_BADGE[m.status]}`}>
                      {MATCH_STATUS_LABEL[m.status]}
                    </span>
                  </div>
                </Card>
              )}
            />
          )}
        </div>
      )}

      {recommendFor && (
        <RecommendModal
          mentee={recommendFor}
          mentors={verifiedMentors}
          onClose={() => setRecommendFor(null)}
          onRecommend={async (menteeId, mentorId, breakdown) => {
            await recommendMatch(menteeId, mentorId, breakdown)
            setRecommendFor(null)
            setNotice('Recommendation sent to the mentee.')
            await load()
          }}
        />
      )}
    </div>
  )
}

function List({ items, render, empty }) {
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border-strong bg-surface p-10 text-center text-sm text-ink-subtle">
        {empty}
      </div>
    )
  }
  return <div className="space-y-3">{items.map(render)}</div>
}

function ProfileRow({ p, right, extra }) {
  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink">{who(p)}</p>
          <MStatus status={p.status} />
        </div>
        <p className="mt-0.5 text-xs text-ink-subtle">
          {p.field || 'No field'}{extra ? ` · ${extra}` : ''}
        </p>
      </div>
      <div className="shrink-0">{right}</div>
    </Card>
  )
}

function RecommendModal({ mentee, mentors, onClose, onRecommend }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const ranked = useMemo(
    () => mentors.map((m) => ({ m, ...scoreMentor(mentee, m) })).sort((a, b) => b.percent - a.percent),
    [mentee, mentors],
  )

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold text-ink">Recommend a mentor</h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              For <span className="font-medium text-ink">{who(mentee)}</span> · {mentee.field}. Ranked by the six weighted criteria — verified mentors only.
            </p>
          </div>
          <button onClick={onClose} className="focus-ring rounded-btn p-1 text-ink-subtle hover:bg-surface-2 hover:text-ink" aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="mb-3 rounded-btn border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">{error}</p>}
          {ranked.length === 0 ? (
            <div className="rounded-card border border-dashed border-border-strong p-8 text-center text-sm text-ink-subtle">
              No verified mentors are available to match. Verify a mentor first (Mentors tab).
            </div>
          ) : (
            <ul className="space-y-3">
              {ranked.map(({ m, percent, breakdown }, i) => (
                <li key={m.id} className={`rounded-card border p-4 ${i === 0 ? 'border-brand-200 bg-brand-50' : 'border-border'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">{who(m)}</p>
                        {i === 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">Best match</span>}
                      </div>
                      <p className="text-xs text-ink-subtle">{m.field} · capacity {m.capacity}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-sm font-semibold text-brand-800 tnum">{percent}%</span>
                  </div>
                  <div className="mt-3"><ScoreBreakdown criteria={breakdown} /></div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      disabled={busyId !== null}
                      onClick={async () => {
                        setBusyId(m.id); setError('')
                        try { await onRecommend(mentee.id, m.id, breakdown) } catch (e) { setError(e.message); setBusyId(null) }
                      }}
                    >
                      {busyId === m.id ? 'Recommending…' : 'Recommend'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
