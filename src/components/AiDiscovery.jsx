import { useState } from 'react'
import Button from './ui/Button'
import Icon from './ui/Icon'
import { SkeletonRows } from './ui/Skeleton'
import { TYPE_LABEL, TYPE_OPTIONS } from '../lib/opportunities'
import { findOpportunities, confirmAiOpportunities } from '../lib/aiDiscovery'

const EMPTY = { type: '', field: '', geography: '', keywords: '' }

export default function AiDiscovery({ userId, onClose, onConfirmed }) {
  const [params, setParams] = useState(EMPTY)
  const [phase, setPhase] = useState('form') // form | searching | results | confirming
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [cached, setCached] = useState(false)
  const [formatter, setFormatter] = useState(null)
  const [formatterDetail, setFormatterDetail] = useState('')
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setParams((p) => ({ ...p, [k]: e.target.value }))
  const canSearch = params.keywords.trim() || params.field.trim() || params.type

  async function runSearch(e) {
    e.preventDefault()
    setPhase('searching')
    setError('')
    setSelected(new Set())
    try {
      const { candidates: found, cached: wasCached, formatter: fmt, formatterDetail: fdet } =
        await findOpportunities(params)
      setCandidates(found)
      setCached(wasCached)
      setFormatter(fmt)
      setFormatterDetail(fdet)
      setSearched(true)
      setPhase('results')
    } catch (err) {
      setError(err.message || 'Search failed.')
      setPhase('form')
    }
  }

  function toggle(i) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function confirm() {
    setPhase('confirming')
    setError('')
    try {
      const chosen = [...selected].map((i) => ({ ...candidates[i], geography: params.geography.trim() }))
      const count = await confirmAiOpportunities(chosen, userId)
      onConfirmed?.(count)
    } catch (err) {
      setError(err.message || 'Could not add the selected opportunities.')
      setPhase('results')
    }
  }

  const busy = phase === 'searching' || phase === 'confirming'

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name="sparkles" size={18} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">Find with AI</h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                Searches a curated list of trusted opportunity portals only — never the open web.
                You confirm what enters the queue.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="focus-ring rounded-btn p-1 text-ink-subtle hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Parameters */}
          <form onSubmit={runSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="ai-type">Type</label>
                <select id="ai-type" className="field mt-1" value={params.type} onChange={set('type')} disabled={busy}>
                  <option value="">Any type</option>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="ai-field">Field</label>
                <input id="ai-field" className="field mt-1" value={params.field} onChange={set('field')} placeholder="e.g. Computer Science" disabled={busy} />
              </div>
              <div>
                <label className="field-label" htmlFor="ai-geo">Geography</label>
                <input id="ai-geo" className="field mt-1" value={params.geography} onChange={set('geography')} placeholder="e.g. Rwanda; East Africa" disabled={busy} />
              </div>
              <div>
                <label className="field-label" htmlFor="ai-kw">Keywords</label>
                <input id="ai-kw" className="field mt-1" value={params.keywords} onChange={set('keywords')} placeholder="e.g. fully funded masters" disabled={busy} />
              </div>
            </div>

            {error && (
              <p className="rounded-btn border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" icon="search" disabled={!canSearch || busy}>
                {phase === 'searching' ? 'Searching…' : searched ? 'Search again' : 'Search trusted portals'}
              </Button>
              {phase === 'results' && (
                <span className="text-xs text-ink-subtle" title={formatterDetail || undefined}>
                  {cached && 'Cached (within 24h). '}
                  {formatter === 'basic'
                    ? `Basic extraction — AI formatter unavailable${formatterDetail ? ` (${formatterDetail})` : ''}; fields may need editing.`
                    : formatter && formatter !== 'cached' && `Formatted with ${formatter}.`}
                </span>
              )}
            </div>
          </form>

          {/* Results */}
          <div className="mt-6">
            {phase === 'searching' ? (
              <SkeletonRows rows={3} />
            ) : searched && candidates.length === 0 ? (
              <div className="rounded-card border border-dashed border-border-strong p-8 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink-subtle">
                  <Icon name="search" size={20} />
                </span>
                <p className="mt-3 text-sm font-medium text-ink">No opportunities found in the trusted portals.</p>
                <p className="mt-1 text-sm text-ink-subtle">Try broader keywords or a different field.</p>
                {formatterDetail && (
                  <p className="mt-2 text-[11px] text-ink-subtle">{formatterDetail}</p>
                )}
              </div>
            ) : candidates.length > 0 ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">
                    {candidates.length} candidate{candidates.length === 1 ? '' : 's'} · tick the ones to add
                  </h3>
                  <span className="text-xs text-ink-subtle">{selected.size} selected</span>
                </div>
                <ul className="space-y-2.5">
                  {candidates.map((c, i) => (
                    <li key={i}>
                      <label
                        className={`flex cursor-pointer gap-3 rounded-card border p-4 transition-colors ${
                          selected.has(i) ? 'border-brand-300 bg-brand-50' : 'border-border bg-surface hover:bg-surface-2'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                          checked={selected.has(i)}
                          onChange={() => toggle(i)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-ink">{c.title}</span>
                            <span className="rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                              {TYPE_LABEL[c.type] ?? c.type}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-ink-subtle">
                            {c.provider}
                            {c.deadline ? ` · Deadline ${c.deadline}` : ' · No deadline stated'}
                          </div>
                          {c.summary && (
                            <p className="mt-1.5 text-xs text-ink-muted">
                              <span className="font-medium text-ink">Summary:</span> {c.summary}
                            </p>
                          )}
                          {c.eligibility && (
                            <p className="mt-1 text-xs text-ink-muted">
                              <span className="font-medium text-ink">Eligibility:</span> {c.eligibility}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                            {c.application_link && (
                              <a
                                href={c.application_link}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                              >
                                Apply link <Icon name="arrowUpRight" size={13} />
                              </a>
                            )}
                            {c.source_link && c.source_link !== c.application_link && (
                              <a
                                href={c.source_link}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-medium text-ink-subtle hover:underline"
                              >
                                Source <Icon name="arrowUpRight" size={13} />
                              </a>
                            )}
                          </div>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border p-5">
          <p className="text-xs text-ink-subtle">
            Confirmed items enter at <span className="font-medium text-ink-muted">Received</span>, tagged AI-sourced, and go through full verification.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={confirm} disabled={selected.size === 0 || busy} icon="plus">
              {phase === 'confirming' ? 'Adding…' : `Add ${selected.size || ''} to queue`.trim()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
