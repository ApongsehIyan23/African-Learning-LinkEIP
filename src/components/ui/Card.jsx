export default function Card({ as: Comp = 'div', className = '', padded = true, children, ...rest }) {
  return (
    <Comp
      className={`rounded-card border border-border bg-surface shadow-card ${
        padded ? 'p-5' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </Comp>
  )
}
