import type { HostCommand, OptionLabel } from '../domain/session'
import type {
  AnswerReceipt,
  JoinedParticipant,
  SessionRecord,
  SessionSnapshot,
} from '../domain/build-two'
import { ensureAnonymousSession, supabase } from './supabase'

type ApiEnvelope<T> = { data: T } | { error: string }

async function callQuizApi<T>(body: Record<string, unknown>): Promise<T> {
  await ensureAnonymousSession()
  const { data, error } = await supabase.functions.invoke<ApiEnvelope<T>>('quiz-api', {
    body,
  })

  if (error) {
    let detail = error.message
    const context = (error as { context?: Response }).context
    if (context && typeof context.text === 'function') {
      const responseText = await context.text().catch(() => '')
      if (responseText) {
        try {
          const responseBody = JSON.parse(responseText) as { error?: string }
          detail = responseBody.error ?? responseText
        } catch {
          detail = responseText
        }
      }
    }
    throw new Error(detail)
  }
  if (!data || 'error' in data) {
    throw new Error(data?.error ?? 'The quiz API returned an empty response.')
  }

  return data.data
}

export const quizApi = {
  createSession: () =>
    callQuizApi<SessionRecord & { phase_version: number }>({
      action: 'create-session',
    }),
  joinSession: (pin: string, nickname: string) =>
    callQuizApi<JoinedParticipant>({ action: 'join-session', pin, nickname }),
  submitAnswer: (sessionId: string, option: OptionLabel) =>
    callQuizApi<AnswerReceipt>({ action: 'submit-answer', sessionId, option }),
  hostCommand: (
    sessionId: string,
    command: HostCommand | 'close_answers',
    expectedVersion: number,
  ) => callQuizApi<SessionRecord>({ action: 'host-command', sessionId, command, expectedVersion }),
  snapshot: (sessionId: string) =>
    callQuizApi<SessionSnapshot>({ action: 'snapshot', sessionId }),
}
