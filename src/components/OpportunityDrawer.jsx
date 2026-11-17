import { useCallback, useEffect, useState } from 'react'
import StatusBadge from './StatusBadge'
import OpportunityForm from './OpportunityForm'
import Spinner from './Spinner'
import {
  getOpportunity,
  CRITERIA,
  RESULT_LABEL,
  RESULT_BADGE,
  TYPE_LABEL,
  availableActions,
  canEditCriteria,
  startReview,
  startVerification,
  approve,
  publish,
  resume,
  markExpired,
  requestInfo,
  reject,
  setCriterion,
  updateFields,
} from '../lib/opportunities'

const ACTION_LABEL = {
  start_review: 'Start review',
  start_verification: 'Start verification',
  approve: 'Approve for publication',
  request_info: 'Request info',
  resume: 'Resume verification',
  publish: 'Publish',
  reject: 'Reject',
  mark_expired: 'Mark expired / closed',
  edit: 'Edit fields',
}

function actionClass(key) {
  if (key === 'approve' || key === 'publish')
    return 'bg-brand-600 text-white hover:bg-brand-700'
  if (key === 'reject') return 'bg-rose-600 text-white hover:bg-rose-700'
  return 'border border-slate-300 text-slate-700 hover:bg-slate-100'
}

function who(u) {
  return u?.full_name || u?.email || '—'
}

function Field({ label, value, link }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 break-words">
        {link && value ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-brand-600 underline break-all">
            {value}
          </a>
        ) : (
          value || <span className="text-slate-400">—</span>
        )}
      </dd>
    </div>
  )
}

function CriterionRow({ c, row, editable, onSave }) {
  const [result, setResult] = useState(row?.result ?? 'unchecked')
  const [note, setNote] = useState(row?.note ?? '')
  const [busy, setBusy] = useState(false)
  const dirty = result !== (row?.result ?? 'unchecked') || note !== (row?.note ?? '')

  async function save() {
    setBusy(true)
    try {
      await onSave(c.key, result, note)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">
          {c.label} <span className="text-xs text-slate-400">({c.sop})</span>
        </span>
        {!editable && (
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${RESULT_BADGE[row?.result ?? 'unchecked']}`}>
            {RESULT_LABEL[row?.result ?? 'unchecked']}
          </span>
        )}
      </div>
      {editable ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {['pass', 'flag', 'fail', 'unchecked'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setResult(r)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  result === r ? RESULT_BADGE[r] + ' ring-2 ring-offset-1 ring-slate-300' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {RESULT_LABEL[r]}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!dirty || busy}
              onClick={save}
              className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        row?.note && <p className="mt-1 text-xs text-slate-500">{row.note}</p>
      )}
    </div>
  )
}

function ReasonModal({ title, confirmLabel, onConfirm, onClose }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function go() {
    setBusy(true)
    setError('')
    try {
      await onConfirm(text)
    } catch (err) {
      setError(err.message || 'Failed.')
      setBusy(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold">{title}</h3>
        <textarea
          autoFocus
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="This is required and recorded in the activity log."
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
        {error && <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={go}
            disabled={busy || text.trim().length === 0}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OpportunityDrawer({ oppId, role, userId, onClose, onChanged }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [modal, setModal] = useState(null) // 'reject' | 'request_info'
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await getOpportunity(oppId)
      setData(d)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [oppId])

  useEffect(() => {
    load()
  }, [load])

  const opp = data?.opportunity
  const isOwner = opp && opp.submitted_by === userId
  const actions = opp ? availableActions(opp.current_status, role, isOwner) : []
  const editable = opp ? canEditCriteria(opp.current_status, role) : false

  async function run(fn, successMsg) {
    setBusy(true)
    setError('')
    setMsg('')
    try {
      await fn()
      setMsg(successMsg || 'Done.')
      await load()
      onChanged?.()
    } catch (err) {
      setError(err.message || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  function handleAction(key) {
    if (key === 'edit') return setEditing(true)
    if (key === 'reject') return setModal('reject')
    if (key === 'request_info') return setModal('request_info')
    const map = {
      start_review: [() => startReview(oppId), 'Moved to Under Review.'],
      start_verification: [() => startVerification(oppId), 'Verification started.'],
      approve: [() => approve(oppId), 'Approved for publication.'],
      publish: [() => publish(oppId), 'Published.'],
      resume: [() => resume(oppId), 'Resumed verification.'],
      mark_expired: [() => markExpired(oppId), 'Marked expired / closed.'],
    }
    const [fn, m] = map[key] || []
    if (fn) run(fn, m)
  }

  const critByKey = Object.fromEntries((data?.criteria ?? []).map((r) => [r.criterion, r]))

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
          <div className="min-w-0">
            {opp && <StatusBadge status={opp.current_status} />}
            <h2 className="mt-2 truncate text-lg font-semibold text-slate-900">
              {opp?.title ?? 'Opportunity'}
            </h2>
            {opp && (
              <p className="text-sm text-slate-500">
                {opp.provider} · {TYPE_LABEL[opp.type]}
                {opp.source_method === 'ai_agent' && (
                  <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">AI-sourced</span>
                )}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            ✕
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : !opp ? (
          <div className="p-6 text-sm text-rose-600">{error || 'Not found.'}</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {(error || msg) && (
              <p className={`mb-4 rounded-md border px-3 py-2 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {error || msg}
              </p>
            )}

            {/* Actions */}
            {actions.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {actions.map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={busy}
                    onClick={() => handleAction(key)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${actionClass(key)}`}
                  >
                    {ACTION_LABEL[key]}
                    {key === 'publish' && role !== 'super_admin' && (
                      <span className="ml-1 text-xs opacity-80">(Super Admin only)</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Register fields */}
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Provider" value={opp.provider} />
              <Field label="Type" value={TYPE_LABEL[opp.type]} />
              <Field label="Deadline" value={opp.deadline} />
              <Field label="Date received" value={opp.date_received} />
              <Field label="Geographic restrictions" value={opp.geo_restrictions} />
              <Field label="Submitted by" value={who(opp.submitter)} />
              <Field label="Source link" value={opp.source_link} link />
              <Field label="Application link" value={opp.application_link} link />
              {opp.publication_date && <Field label="Publication date" value={opp.publication_date} />}
            </dl>
            {opp.eligibility && (
              <div className="mt-4">
                <Field label="Eligibility" value={opp.eligibility} />
              </div>
            )}

            {/* Criteria */}
            <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-900">
              Six verification criteria
              {!editable && <span className="ml-2 text-xs font-normal text-slate-400">(read-only at this status)</span>}
            </h3>
            <div className="space-y-2">
              {CRITERIA.map((c) => (
                <CriterionRow
                  key={c.key}
                  c={c}
                  row={critByKey[c.key]}
                  editable={editable}
                  onSave={(k, r, n) => run(() => setCriterion(oppId, k, r, n), 'Criterion saved.')}
                />
              ))}
            </div>

            {/* Activity log */}
            <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-900">Activity log</h3>
            <ul className="space-y-2">
              {data.activity.map((a) => (
                <li key={a.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{a.action}</span>
                    <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  {a.note && <p className="mt-0.5 text-sm text-slate-600">{a.note}</p>}
                  <p className="mt-0.5 text-xs text-slate-400">by {who(a.actor)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {modal === 'reject' && (
        <ReasonModal
          title="Reject opportunity — reason required"
          confirmLabel="Reject"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await reject(oppId, reason)
            setModal(null)
            setMsg('Opportunity rejected.')
            await load()
            onChanged?.()
          }}
        />
      )}
      {modal === 'request_info' && (
        <ReasonModal
          title="Request additional information — note required"
          confirmLabel="Request info"
          onClose={() => setModal(null)}
          onConfirm={async (note) => {
            await requestInfo(oppId, note)
            setModal(null)
            setMsg('Moved to Awaiting Additional Information.')
            await load()
            onChanged?.()
          }}
        />
      )}
      {editing && opp && (
        <OpportunityForm
          title="Edit opportunity"
          initial={{
            title: opp.title,
            provider: opp.provider,
            type: opp.type,
            source_link: opp.source_link ?? '',
            deadline: opp.deadline ?? '',
            eligibility: opp.eligibility ?? '',
            application_link: opp.application_link ?? '',
            geo_restrictions: opp.geo_restrictions ?? '',
          }}
          onClose={() => setEditing(false)}
          onSubmit={async (fields) => {
            await updateFields(oppId, fields)
            setEditing(false)
            setMsg('Opportunity updated.')
            await load()
            onChanged?.()
          }}
        />
      )}
    </div>
  )
}
