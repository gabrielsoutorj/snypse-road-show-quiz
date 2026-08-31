export const SESSION_PHASES = [
  'lobby',
  'question_open',
  'answers_closed',
  'question_result',
  'answer_reveal',
  'ranking',
  'podium',
  'ended',
] as const

export type SessionPhase = (typeof SESSION_PHASES)[number]

export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const
export type OptionLabel = (typeof OPTION_LABELS)[number]

export type HostCommand =
  | 'start_question'
  | 'show_result'
  | 'reveal_answer'
  | 'show_ranking'
  | 'show_podium'
  | 'end_session'

export const MAX_QUESTION_POINTS = 1_000
export const MIN_CORRECT_POINTS = 500

export function calculatePoints(
  isCorrect: boolean,
  responseMs: number,
  durationMs: number,
): number {
  if (!isCorrect || durationMs <= 0) return 0

  const elapsed = Math.min(Math.max(responseMs, 0), durationMs)
  const speedRatio = 1 - elapsed / durationMs

  return Math.round(
    MIN_CORRECT_POINTS +
      (MAX_QUESTION_POINTS - MIN_CORRECT_POINTS) * speedRatio,
  )
}
