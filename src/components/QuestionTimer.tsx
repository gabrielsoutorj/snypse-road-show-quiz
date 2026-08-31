type Props = {
  seconds: number
  durationSeconds: number
  compact?: boolean
}

export function QuestionTimer({ seconds, durationSeconds, compact = false }: Props) {
  const progress = durationSeconds > 0 ? Math.max(0, Math.min(1, seconds / durationSeconds)) : 0
  const degrees = Math.round(progress * 360)

  return (
    <div
      className={`question-timer ${compact ? 'question-timer-compact' : ''}`}
      style={{ '--timer-progress': `${degrees}deg` } as CSSProperties}
      aria-label={`${seconds} segundos restantes`}
    >
      <span>{seconds}</span>
      <small>s</small>
    </div>
  )
}
import type { CSSProperties } from 'react'
