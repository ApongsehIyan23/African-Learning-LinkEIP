import { useState } from 'react'
import { TYPE_LABEL, TYPE_OPTIONS } from '../lib/opportunities'

const EMPTY = {
  title: '',
  provider: '',
  type: 'scholarship',
  source_link: '',
  deadline: '',
  summary: '',
  eligibility: '',
  application_link: '',
  geo_restrictions: '',
}

const field = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
const label = 'block text-sm font-medium text-slate-700'

export default function OpportunityForm({ initial, title = 'Log a new opportunity', onSubmit, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.provider.trim()) {
      setError('Title and provider are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err.message || 'Could not save.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={label}>Title *</label>
            <input className={field} value={form.title} onChange={set('title')} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Provider *</label>
              <input className={field} value={form.provider} onChange={set('provider')} required />
            </div>
            <div>
              <label className={label}>Type *</label>
              <select className={field} value={form.type} onChange={set('type')}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Deadline</label>
              <input type="date" className={field} value={form.deadline ?? ''} onChange={set('deadline')} />
            </div>
            <div>
              <label className={label}>Geographic restrictions</label>
              <input className={field} value={form.geo_restrictions ?? ''} onChange={set('geo_restrictions')} placeholder="e.g. Rwanda; East Africa" />
            </div>
          </div>
          <div>
            <label className={label}>Summary</label>
            <textarea className={field} rows={3} value={form.summary ?? ''} onChange={set('summary')} placeholder="What the opportunity is and what it offers." />
          </div>
          <div>
            <label className={label}>Eligibility</label>
            <textarea className={field} rows={2} value={form.eligibility ?? ''} onChange={set('eligibility')} placeholder="Who can apply — nationality, level, field, requirements." />
          </div>
          <div>
            <label className={label}>Source link</label>
            <input type="url" className={field} value={form.source_link ?? ''} onChange={set('source_link')} placeholder="https://" />
          </div>
          <div>
            <label className={label}>Application link</label>
            <input type="url" className={field} value={form.application_link ?? ''} onChange={set('application_link')} placeholder="https://" />
          </div>

          {error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
