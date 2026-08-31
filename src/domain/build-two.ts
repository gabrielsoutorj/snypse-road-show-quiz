import type { OptionLabel, SessionPhase } from './session'

export type Participant = {
  id: string
  nickname: string
  total_points: number
  correct_answers: number
  total_response_ms: number
  joined_at: string
  user_id?: string
}

export type SessionRecord = {
  id: string
  pin: string
  phase: SessionPhase
  phase_version: number
  status: 'active' | 'ended' | 'cancelled'
}

export type JoinedParticipant = Participant & {
  session_id: string
  user_id: string
}

export type QuestionOption = {
  id: string
  label: OptionLabel
  text: string
  position: number
}

export type QuestionSnapshot = {
  id: string
  position: number
  title: string
  supportText: string | null
  durationSeconds: number
  showRankingAfter: boolean
  options: QuestionOption[]
}

export type AnswerReceipt = {
  answer_id: string
  submitted_at: string
  response_ms: number
}

export type OwnAnswer = {
  id: string
  option_id: string
  submitted_at: string
  response_ms: number
}

export type QuestionResult = {
  totalAnswers: number
  counts: Record<OptionLabel, number>
}

export type AnswerReveal = {
  correctOption: OptionLabel
  insightTitle: string | null
  insightBody: string | null
}

export type SessionSnapshot = {
  serverNow: string
  role: 'host' | 'participant'
  session: {
    id: string
    pin: string
    status: 'active' | 'ended' | 'cancelled'
    phase: SessionPhase
    phaseVersion: number
    currentQuestionId: string | null
    questionOpenedAt: string | null
    answerDeadlineAt: string | null
  }
  participant: Participant | null
  participants?: Participant[]
  questionCount: number
  question?: QuestionSnapshot
  ownAnswer?: OwnAnswer | null
  answerCount?: number
  result?: QuestionResult
  reveal?: AnswerReveal
  ranking?: Participant[]
}

export function normalizePin(value: string) {
  return value.replace(/\D/g, '').slice(0, 6)
}

export function isValidPin(value: string) {
  return /^\d{6}$/.test(value)
}

export function normalizeNickname(value: string) {
  return value.replace(/\s+/g, ' ').trimStart().slice(0, 24)
}

export function validateNickname(value: string) {
  const normalized = value.trim()
  if (normalized.length < 2) return 'Digite pelo menos 2 caracteres.'
  if (normalized.length > 24) return 'Use no máximo 24 caracteres.'
  return null
}

const errorMessages: Record<string, string> = {
  INVALID_PIN: 'Digite um PIN de 6 números.',
  SESSION_NOT_FOUND: 'Sala não encontrada. Confira o PIN.',
  SESSION_ALREADY_STARTED: 'Esta rodada já começou.',
  INVALID_NICKNAME: 'Escolha um nickname entre 2 e 24 caracteres.',
  NICKNAME_ALREADY_IN_USE: 'Este nickname já está sendo usado na sala.',
  SESSION_ACCESS_DENIED: 'Você não faz parte desta sala.',
  QUESTION_NOT_OPEN: 'Esta pergunta já foi encerrada.',
  ANSWER_DEADLINE_EXPIRED: 'O tempo para responder terminou.',
  STALE_PHASE_VERSION: 'O telão avançou. Sincronizando o estado atual…',
  INVALID_PHASE_TRANSITION: 'Esta ação não está disponível agora.',
  NO_NEXT_QUESTION: 'Todas as perguntas já foram apresentadas.',
  QUIZ_HAS_REMAINING_QUESTIONS: 'Ainda existem perguntas antes do pódio.',
}

export function friendlyQuizError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const code = Object.keys(errorMessages).find((key) => message.includes(key))
  if (code) return errorMessages[code]

  if (message.includes('Supabase ainda não está conectado')) return message
  return 'Não foi possível concluir agora. Tente novamente.'
}
