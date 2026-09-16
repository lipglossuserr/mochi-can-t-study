import AnimatedNumber from '@/features/pet/components/AnimatedNumber'

interface FloatingStatWidgetProps {
  emoji: string
  label: string
  value: number
  /** 0-100 stats (mood/hunger/bond) get a tiny bar; coins doesn't. */
  isPercent?: boolean
  barColorClass?: string
}

/**
 * FloatingStatWidget
 *
 * A stat presented as a loose, borderless chip rather than a card:
 * just an emoji, a number, and — for percent stats — a hairline bar
 * with no container around it. Several of these sitting in a row with
 * generous gaps should read as "a few small facts floating near the
 * room", not "a stat panel". Numbers count up via AnimatedNumber;
 * functionality (values, a11y attributes) is unchanged from before.
 */
function FloatingStatWidget({
  emoji,
  label,
  value,
  isPercent = false,
  barColorClass = 'bg-taro',
}: FloatingStatWidgetProps) {
  const clamped = isPercent ? Math.max(0, Math.min(100, value)) : value

  return (
    <div className="flex min-w-[4.5rem] items-center gap-1.5 px-1.5 py-1">
      <span className="text-base opacity-90 sm:text-lg" aria-hidden="true">
        {emoji}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-body text-[9px] font-medium uppercase tracking-wider text-ink/40">
          {label}
        </p>
        <p className="font-display text-xs font-semibold text-ink/80 sm:text-sm">
          <AnimatedNumber value={clamped} formatter={isPercent ? (v) => `${v}%` : undefined} />
        </p>
        {isPercent && (
          <div
            className="mt-1 h-[3px] w-12 overflow-hidden rounded-full bg-ink/10 sm:w-14"
            role="progressbar"
            aria-label={label}
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full ${barColorClass} opacity-80`}
              style={{ width: `${clamped}%`, transition: 'width 0.4s ease-out' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default FloatingStatWidget
