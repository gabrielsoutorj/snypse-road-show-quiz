import type { HostCommand, SessionPhase } from './session'

export type HostFlowAction = {
  command: HostCommand | 'close_answers'
  label: string
}

export function getHostFlowAction(
  phase: SessionPhase,
  questionPosition: number,
  questionCount: number,
  showRankingAfter: boolean,
): HostFlowAction | null {
  if (phase === 'question_open') {
    return { command: 'close_answers', label: 'Encerrar respostas' }
  }
  if (phase === 'answers_closed') {
    return { command: 'show_result', label: 'Mostrar resultado' }
  }
  if (phase === 'question_result') {
    return { command: 'reveal_answer', label: 'Revelar resposta correta' }
  }
  if (phase === 'answer_reveal') {
    if (questionPosition >= questionCount) {
      return { command: 'show_podium', label: 'Mostrar pódio final' }
    }
    if (showRankingAfter) {
      return { command: 'show_ranking', label: 'Mostrar ranking' }
    }
    return { command: 'start_question', label: 'Próxima pergunta' }
  }
  if (phase === 'ranking') {
    if (questionPosition >= questionCount) {
      return { command: 'show_podium', label: 'Mostrar pódio final' }
    }
    return { command: 'start_question', label: 'Próxima pergunta' }
  }
  if (phase === 'podium') {
    return { command: 'end_session', label: 'Encerrar sessão' }
  }
  return null
}

export function calculateAnswerPercentage(count: number, total: number) {
  if (total <= 0) return 0
  return Math.round((Math.max(0, count) / total) * 100)
}
