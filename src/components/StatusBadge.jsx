import { STATUS_LABEL, STATUS_BADGE, STATUS_ICON } from '../lib/opportunities'
import Icon from './ui/Icon'

export default function StatusBadge({ status, size = 'md', className = '' }) {
  const sm = size === 'sm'
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium ${
        sm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
      } ${STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-700 border-slate-200'} ${className}`}
    >
      {STATUS_ICON[status] && <Icon name={STATUS_ICON[status]} size={sm ? 12 : 13} strokeWidth={2.25} />}
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}
