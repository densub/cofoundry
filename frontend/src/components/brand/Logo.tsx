type LogoSize = 'sm' | 'md' | 'lg'

const SIZES: Record<LogoSize, { icon: number; text: string }> = {
  sm: { icon: 22, text: 'text-base' },
  md: { icon: 28, text: 'text-xl' },
  lg: { icon: 36, text: 'text-2xl' },
}

/** Geometric mark: two linked tiles (co-founders / shared graph). */
export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="#161b22" />
      <rect x="5" y="9" width="12" height="12" rx="3.5" fill="#58a6ff" />
      <rect x="15" y="11" width="12" height="12" rx="3.5" fill="#3fb950" />
      <rect x="13" y="14" width="6" height="4" rx="1" fill="#e6edf3" />
    </svg>
  )
}

export function Logo({
  size = 'md',
  showWordmark = true,
  className = '',
}: {
  size?: LogoSize
  showWordmark?: boolean
  className?: string
}) {
  const s = SIZES[size]
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={s.icon} />
      {showWordmark && (
        <span className={`font-semibold tracking-tight leading-none ${s.text}`}>
          <span className="text-brand-400">Co</span>
          <span className="text-fg">Foundry</span>
        </span>
      )}
    </div>
  )
}
