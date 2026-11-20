import { MATCH_CRITERIA } from '../../lib/matching'

const META = Object.fromEntries(MATCH_CRITERIA.map((c) => [c.key, c]))

// Accepts either the live breakdown ({key,...}) or stored rows ({criterion,...}).
export default function ScoreBreakdown({ criteria = [] }) {
  return (
    <ul className="space-y-2.5">
      {criteria.map((c, i) => {
        const key = c.key ?? c.criterion
        const meta = META[key] ?? { label: key, priority: '', weight: c.weight }
        const pct = Math.round((Number(c.score) || 0) * 100)
        return (
          <li key={i}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-ink">
                {meta.label}
                <span className="ml-1 font-normal text-ink-subtle">
                  {meta.priority ? `· ${meta.priority} ` : ''}×{c.weight ?? meta.weight}
                </span>
              </span>
              <span className="tnum text-ink-muted">{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full ${pct >= 50 ? 'bg-brand-500' : pct >= 20 ? 'bg-brand-300' : 'bg-slate-300'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
