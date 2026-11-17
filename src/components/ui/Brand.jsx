import { Link } from 'react-router-dom'

// The ALL mark. The logo wordmark already reads "ALL", so on wider layouts the
// image stands alone; `showText` adds the full name beside it where there's room.
export default function Brand({ to = '/', showText = false, onClick, className = '' }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2.5 ${className}`}
      aria-label="African Learning Link — home"
    >
      <img
        src="/all-logo.png"
        alt="African Learning Link"
        className="h-8 w-8 shrink-0 object-contain"
        width={32}
        height={32}
      />
      {showText && (
        <span className="text-sm font-semibold leading-tight tracking-tight text-ink">
          African
          <br />
          Learning Link
        </span>
      )}
    </Link>
  )
}
