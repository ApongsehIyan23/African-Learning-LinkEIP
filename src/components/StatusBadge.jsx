import { STATUS_LABEL, STATUS_BADGE } from '../lib/opportunities'

export default function StatusBadge({ status, className = '' }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
      } ${className}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}
