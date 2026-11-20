import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Card from '../components/ui/Card'
import Spinner from '../components/Spinner'
import ScoreBreakdown from '../components/matching/ScoreBreakdown'
import {
  getMyMenteeProfile,
  getMyMentorProfile,
  saveMenteeProfile,
  saveMentorProfile,
  myMatch,
  acceptMatch,
  declineMatch,
  submitFeedback,
  MATCHING_STATUS_LABEL,
  MATCHING_STATUS_BADGE,
} from '../lib/matching'

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${MATCHING_STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {MATCHING_STATUS_LABEL[status] ?? status}
    </span>
  )
}

const EMPTY = { field: '', career_goals: '', skills: '', experience: '', languages: '', availability: '', interests: '', capacity: 1 }

export default function Mentorship() {
  const { user, role } = useAuth()
  const isMentor = role === 'mentor'
  const [profile, setProfile] = useState(null)
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    try {
      const p = isMentor ? await getMyMentorProfile(user.id) : await getMyMenteeProfile(user.id)
      setProfile(p)
      setMatch(p ? await myMatch() : null)
      setEditing(!p)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [isMentor, user.id])

  if (loading) return <Spinner label="Loading your mentorship profile…" />

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {isMentor ? 'Mentor' : 'Mentee'} profile
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isMentor
            ? 'Build your profile so the team can match you with a mentee. You enter the matchable pool once staff verify you.'
            : 'Build your profile to be matched with a mentor across six criteria.'}
        </p>
      </div>

      {error && <p className="mt-4 rounded-btn border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">{error}</p>}
      {notice && <p className="mt-4 rounded-btn border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700">{notice}</p>}

      {editing ? (
        <ProfileForm
          isMentor={isMentor}
          initial={profile ?? EMPTY}
          onCancel={profile ? () => setEditing(false) : null}
          onSaved={async () => {
            setNotice('Profile saved.')
            await load()
          }}
        />
      ) : (
        <>
          <Card className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={profile.status} />
              <div className="flex items-center gap-2">
                {isMentor && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${profile.verified ? 'bg-success-50 text-success-700 border-success-100' : 'bg-warning-50 text-warning-700 border-warning-100'}`}>
                    <Icon name={profile.verified ? 'shieldCheck' : 'clock'} size={12} />
                    {profile.verified ? 'Verified' : 'Pending verification'}
                  </span>
                )}
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Field" value={profile.field} />
              <Field label="Availability" value={profile.availability} />
              <Field label="Career goals" value={profile.career_goals} />
              <Field label="Skills" value={profile.skills} />
              <Field label="Experience" value={profile.experience} />
              <Field label="Languages" value={profile.languages} />
              <Field label="Interests & preferences" value={profile.interests} />
              {isMentor && <Field label="Mentee capacity" value={String(profile.capacity)} />}
            </dl>
            {isMentor && !profile.verified && (
              <p className="mt-4 rounded-btn border border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-700">
                You can’t be matched until a staff member verifies you (a safeguard before you’re put in front of students).
              </p>
            )}
          </Card>

          <MatchPanel match={match} isMentor={isMentor} onChanged={load} setNotice={setNotice} />
        </>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm text-ink">{value || <span className="text-ink-subtle">—</span>}</dd>
    </div>
  )
}

function ProfileForm({ isMentor, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.field || !form.career_goals || !form.skills || !form.availability || !form.languages) {
      setError('Field, career goals, skills, availability and languages are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (isMentor) await saveMentorProfile(form)
      else await saveMenteeProfile(form)
      await onSaved()
    } catch (err) {
      setError(err.message || 'Could not save.')
      setBusy(false)
    }
  }

  return (
    <Card className="mt-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Field / industry *</label>
            <input className="field mt-1" value={form.field} onChange={set('field')} placeholder="e.g. Software engineering" />
          </div>
          <div>
            <label className="field-label">Availability *</label>
            <input className="field mt-1" value={form.availability} onChange={set('availability')} placeholder="e.g. Weekday evenings; 2 hrs/week" />
          </div>
        </div>
        <div>
          <label className="field-label">Career goals *</label>
          <textarea className="field mt-1" rows={2} value={form.career_goals} onChange={set('career_goals')} placeholder={isMentor ? 'What you can help a mentee achieve.' : 'What you want to achieve.'} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Skills *</label>
            <textarea className="field mt-1" rows={2} value={form.skills} onChange={set('skills')} placeholder="e.g. React, data analysis, public speaking" />
          </div>
          <div>
            <label className="field-label">Experience</label>
            <textarea className="field mt-1" rows={2} value={form.experience} onChange={set('experience')} placeholder="Relevant background" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Languages *</label>
            <input className="field mt-1" value={form.languages} onChange={set('languages')} placeholder="e.g. English, French, Swahili" />
          </div>
          <div>
            <label className="field-label">Interests & preferences</label>
            <input className="field mt-1" value={form.interests} onChange={set('interests')} placeholder="e.g. Startups, research, remote" />
          </div>
        </div>
        {isMentor && (
          <div className="sm:w-40">
            <label className="field-label">Mentee capacity *</label>
            <input type="number" min="1" className="field mt-1" value={form.capacity} onChange={set('capacity')} />
          </div>
        )}
        {error && <p className="rounded-btn border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">{error}</p>}
        <div className="flex justify-end gap-2">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button>
        </div>
      </form>
    </Card>
  )
}

function MatchPanel({ match, isMentor, onChanged, setNotice }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!match) {
    return (
      <Card className="mt-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink-subtle">
          <Icon name="users" size={20} />
        </span>
        <p className="mt-3 text-sm font-medium text-ink">No match yet</p>
        <p className="mt-1 text-sm text-ink-subtle">
          Once your profile is complete{isMentor ? ' and verified' : ''}, the team will recommend a match. Check back here.
        </p>
      </Card>
    )
  }

  const cp = match.counterpart ?? {}
  const pct = match.match_score != null ? Math.round(Number(match.match_score) * 100) : null
  const canRespond = match.status === 'recommended' && match.i_am === 'mentee'
  const confirmed = match.status === 'connected' || match.status === 'active'

  async function run(fn, msg) {
    setBusy(true); setError('')
    try { await fn(); setNotice(msg); await onChanged() } catch (e) { setError(e.message); setBusy(false) }
  }

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">
          {match.i_am === 'mentee' ? 'Your recommended mentor' : 'Your mentee'}
        </h2>
        {pct != null && (
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 tnum">
            {pct}% match
          </span>
        )}
      </div>

      <div className="mt-3 rounded-card border border-border p-4">
        <p className="font-medium text-ink">{cp.name}</p>
        <p className="text-xs text-ink-subtle">{cp.field}</p>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Career goals" value={cp.career_goals} />
          <Field label="Skills" value={cp.skills} />
          <Field label="Availability" value={cp.availability} />
          <Field label="Languages" value={cp.languages} />
        </dl>
      </div>

      {match.criteria?.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Why this match</h3>
          <ScoreBreakdown criteria={match.criteria} />
        </div>
      )}

      {error && <p className="mt-3 rounded-btn border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">{error}</p>}

      {canRespond && (
        <div className="mt-4 flex gap-2">
          <Button icon="check" disabled={busy} onClick={() => run(() => acceptMatch(match.match_id), 'Match accepted — you’re connected.')}>Accept</Button>
          <Button variant="secondary" disabled={busy} onClick={() => run(() => declineMatch(match.match_id), 'Match declined. You’ll be re-matched.')}>Decline</Button>
        </div>
      )}
      {match.status === 'recommended' && match.i_am === 'mentor' && (
        <p className="mt-4 text-sm text-ink-subtle">Recommended to this mentee — awaiting their response.</p>
      )}
      {confirmed && <FeedbackBox matchId={match.match_id} onChanged={onChanged} setNotice={setNotice} status={match.status} />}
    </Card>
  )
}

function FeedbackBox({ matchId, onChanged, setNotice, status }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!rating) { setError('Pick a rating.'); return }
    setBusy(true); setError('')
    try {
      await submitFeedback(matchId, rating, comment)
      setNotice('Thanks — feedback recorded.')
      setRating(0); setComment('')
      await onChanged()
    } catch (e) { setError(e.message); setBusy(false) }
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">
          <Icon name="check" size={12} /> {status === 'active' ? 'Active' : 'Connected'}
        </span>
        <h3 className="text-sm font-semibold text-ink">Session feedback</h3>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="focus-ring rounded p-0.5">
            <Icon name="star" size={22} className={n <= rating ? 'text-warning-500' : 'text-slate-300'} fill={n <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <textarea className="field mt-2" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How is the mentorship going? (optional)" />
      {error && <p className="mt-2 text-xs text-error-700">{error}</p>}
      <div className="mt-2 flex justify-end">
        <Button size="sm" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit feedback'}</Button>
      </div>
    </div>
  )
}
