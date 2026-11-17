import Icon from './Icon'

// Primary = brand-600 → hover 700 → active 800 (all AA with white text).
const VARIANTS = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 border border-transparent shadow-card',
  secondary:
    'bg-surface text-ink-muted border border-border-strong hover:bg-surface-2 hover:text-ink',
  ghost:
    'bg-transparent text-ink-muted border border-transparent hover:bg-surface-2 hover:text-ink',
  danger:
    'bg-error-600 text-white hover:bg-error-700 border border-transparent',
  'danger-soft':
    'bg-error-50 text-error-700 border border-error-100 hover:bg-error-100',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-10 w-10 justify-center',
}

export default function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  className = '',
  children,
  ...rest
}) {
  return (
    <Comp
      className={`inline-flex items-center justify-center rounded-btn font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        VARIANTS[variant] ?? VARIANTS.primary
      } ${SIZES[size] ?? SIZES.md} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 18} />}
    </Comp>
  )
}
