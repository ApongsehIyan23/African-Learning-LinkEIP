// Loading placeholder — structure-first, modeled on the grayscale wireframe (inspo8).
export default function Skeleton({ className = '', rounded = 'rounded-md' }) {
  return <div className={`skeleton ${rounded} ${className}`} aria-hidden="true" />
}

// Convenience: a few stacked skeleton rows for list/table loading states.
export function SkeletonRows({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
