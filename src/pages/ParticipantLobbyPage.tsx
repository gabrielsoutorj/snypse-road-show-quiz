import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ErrorPage, LoadingPage } from '../components/PageState'
import { ParticipantAvatar } from '../components/ParticipantAvatar'
import { PinDisplay } from '../components/PinDisplay'
import { QuestionOptions } from '../components/QuestionOptions'
import { QuestionTimer } from '../components/QuestionTimer'
import { QuizBackdrop } from '../components/QuizBackdrop'
import { friendlyQuizError } from '../domain/build-two'
import type { OptionLabel } from '../domain/session'
import { useCountdown } from '../hooks/use-countdown'
import { useSessionLobby } from '../hooks/use-session-lobby'
import { quizApi } from '../lib/quiz-api'

export function ParticipantLobbyPage() {
  const { sessionId } = useParams()
  if (!sessionId) return <Navigate to="/session-invalid" replace />

  return <ParticipantLobby sessionId={sessionId} />
}

function ParticipantLobby({ sessionId }: { sessionId: string }) {
  const { snapshot, onlineCount, loading, error, refresh } = useSessionLobby(sessionId)
  const [submitting, setSubmitting] = useState(false)
  const [submittedAnswer, setSubmittedAnswer] = useState<{
    questionId: string
    labels: OptionLabel[]
  } | null>(null)
  const [draftSelections, setDraftSelections] = useState<OptionLabel[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const activeQuestionId = snapshot?.question?.id
  useEffect(() => {
    setSubmitting(false)
    setSubmitError(null)
    setDraftSelections([])
  }, [activeQuestionId])

  if (loading) return <LoadingPage />
  if (error || !snapshot) {
    return <ErrorPage title="Não foi possível entrar" message={error ?? 'Sala indisponível.'} />
  }
  if (!snapshot.participant) {
    return <ErrorPage title="Entrada necessária" message="Digite o PIN e seu nickname antes de abrir o lobby." />
  }

  const question = snapshot.question
  const selectedFromSnapshot = question && snapshot.ownAnswer
    ? snapshot.ownAnswer.selected_options ?? (
        question.options
          .filter((option) => option.id === snapshot.ownAnswer?.option_id)
          .map((option) => option.label)
      )
    : []
  const selected = selectedFromSnapshot.length > 0
    ? selectedFromSnapshot
    : submittedAnswer && submittedAnswer.questionId === question?.id
      ? submittedAnswer.labels
      : []

  if (
    question &&
    !['question_open', 'answers_closed', 'lobby'].includes(snapshot.session.phase)
  ) {
    return <ParticipantStage snapshot={snapshot} />
  }

  if (snapshot.session.phase !== 'lobby' && question) {
    async function submit(labels: OptionLabel[]) {
      if (selected.length > 0 || submitting || labels.length === 0) return
      setSubmitting(true)
      setSubmitError(null)
      try {
        await quizApi.submitAnswer(sessionId, labels)
        setSubmittedAnswer({ questionId: question!.id, labels })
        setSubmitting(false)
        await refresh().catch(() => undefined)
      } catch (reason) {
        setSubmitError(friendlyQuizError(reason))
        await refresh().catch(() => undefined)
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <ParticipantQuestion
        snapshot={snapshot}
        selected={selected}
        draftSelections={draftSelections}
        submitting={submitting}
        submitError={submitError}
        onSelect={(label) => {
          if (selected.length > 0 || submitting) return
          if (question.isMultiSelect) {
            setDraftSelections((current) => current.includes(label)
              ? current.filter((item) => item !== label)
              : [...current, label])
            return
          }
          void submit([label])
        }}
        onSubmitMulti={() => submit(draftSelections)}
      />
    )
  }

  return (
    <QuizBackdrop compact>
      <section className="flex flex-1 flex-col justify-center py-8 text-center">
        <div className="waiting-pulse mx-auto">
          <ParticipantAvatar nickname={snapshot.participant.nickname} size="large" online />
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
          Você está na sala
        </p>
        <h1 className="mt-3 break-words text-4xl font-black sm:text-5xl">
          {snapshot.participant.nickname}
        </h1>
        <p className="mt-4 text-lg text-zinc-400">Aguarde o apresentador iniciar o quiz.</p>

        <div className="mobile-neon-card mt-10 text-left">
          <div className="flex items-center justify-between gap-5 border-b border-white/10 pb-5">
            <div>
              <p className="form-label">Código da sala</p>
              <PinDisplay pin={snapshot.session.pin} compact />
            </div>
            <span className="live-badge">
              <span className="size-2 rounded-full bg-emerald-400" />
              Ao vivo
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-zinc-200">
                {onlineCount || 1} {onlineCount === 1 ? 'pessoa conectada' : 'pessoas conectadas'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Sincronização automática ativa</p>
            </div>
            <span className="loading-dots" aria-label="Aguardando">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      </section>
    </QuizBackdrop>
  )
}

function ParticipantStage({
  snapshot,
}: {
  snapshot: NonNullable<ReturnType<typeof useSessionLobby>['snapshot']>
}) {
  const participant = snapshot.participant!
  const content = {
    question_result: {
      eyebrow: 'Resultado da sala',
      title: 'Olhe para o telão',
      message: 'As respostas de todos estão sendo exibidas agora.',
      icon: '▥',
    },
    answer_reveal: {
      eyebrow: 'Resposta correta',
      title: 'Confira o reveal',
      message: 'A resposta e o insight da rodada estão no telão.',
      icon: '✓',
    },
    ranking: {
      eyebrow: 'Ranking parcial',
      title: 'Como está a disputa?',
      message: 'Os cinco primeiros colocados estão aparecendo no telão.',
      icon: '↗',
    },
    podium: {
      eyebrow: 'Pódio final',
      title: 'Quiz concluído!',
      message: 'Obrigado por participar do Road Show Snypse.',
      icon: '★',
    },
    ended: {
      eyebrow: 'Road Show H2 2026',
      title: 'Até a próxima!',
      message: 'A sessão foi encerrada pelo apresentador.',
      icon: '★',
    },
  }[snapshot.session.phase as 'question_result' | 'answer_reveal' | 'ranking' | 'podium' | 'ended']

  if (!content) return null

  return (
    <QuizBackdrop compact>
      <section className="flex flex-1 flex-col justify-center py-8 text-center">
        <div className="participant-stage-icon mx-auto">{content.icon}</div>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-pink-400">{content.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black leading-tight">{content.title}</h1>
        <p className="mt-4 text-zinc-400">{content.message}</p>

        <div className="mobile-neon-card mt-10 flex items-center gap-4 text-left">
          <ParticipantAvatar nickname={participant.nickname} size="large" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-black">{participant.nickname}</p>
            <p className="mt-2 text-3xl font-black text-pink-400">
              {participant.total_points.toLocaleString('pt-BR')}
              <span className="ml-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">pontos</span>
            </p>
          </div>
        </div>

        {!['podium', 'ended'].includes(snapshot.session.phase) && (
          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-zinc-500">
            <span className="loading-dots"><i /><i /><i /></span>
            Aguarde o apresentador
          </div>
        )}
      </section>
    </QuizBackdrop>
  )
}

type ParticipantQuestionProps = {
  snapshot: NonNullable<ReturnType<typeof useSessionLobby>['snapshot']>
  selected: OptionLabel[]
  draftSelections: OptionLabel[]
  submitting: boolean
  submitError: string | null
  onSelect: (label: OptionLabel) => void
  onSubmitMulti: () => void
}

function ParticipantQuestion({
  snapshot,
  selected,
  draftSelections,
  submitting,
  submitError,
  onSelect,
  onSubmitMulti,
}: ParticipantQuestionProps) {
  const question = snapshot.question!
  const { remainingSeconds, expired } = useCountdown(
    snapshot.session.answerDeadlineAt,
    snapshot.serverNow,
  )
  const isOpen = snapshot.session.phase === 'question_open' && !expired
  const status = useMemo(() => {
    if (selected.length > 0) return 'Resposta enviada'
    if (!isOpen) return 'Respostas encerradas'
    return 'Escolha uma alternativa'
  }, [isOpen, selected.length])

  const visibleSelection = selected.length > 0 ? selected : draftSelections

  return (
    <QuizBackdrop compact>
      <section className="flex flex-1 flex-col py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-pink-400">
              Pergunta {question.position} de {snapshot.questionCount}
            </p>
            <p className="mt-2 text-xs text-zinc-500">Vale até 1.000 pontos</p>
          </div>
          <QuestionTimer seconds={remainingSeconds} durationSeconds={question.durationSeconds} compact />
        </div>

        <div className="mobile-neon-card mt-5">
          <h1 className="text-2xl font-black leading-tight">{question.title}</h1>
          {question.supportText && <p className="mt-3 text-sm leading-relaxed text-zinc-400">{question.supportText}</p>}
        </div>

        <div className="mt-5">
          <QuestionOptions
            options={question.options}
            selected={visibleSelection}
            interactive
            disabled={!isOpen || selected.length > 0 || submitting}
            onSelect={onSelect}
          />
          {question.isMultiSelect && selected.length === 0 && (
            <button
              type="button"
              className="primary-action mt-4 w-full"
              disabled={!isOpen || submitting || draftSelections.length === 0}
              onClick={onSubmitMulti}
            >
              {submitting ? 'Enviando…' : `Confirmar ${draftSelections.length || ''} ${draftSelections.length === 1 ? 'resposta' : 'respostas'}`}
            </button>
          )}
        </div>

        <div className={`answer-status mt-5 ${selected.length > 0 ? 'answer-status-confirmed' : ''}`}>
          <span className="answer-status-icon">{selected.length > 0 ? '✓' : expired ? '×' : '!'}</span>
          <div>
            <p className="font-black uppercase tracking-[0.12em]">{submitting ? 'Enviando…' : status}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {selected.length > 0
                ? `Alternativa${selected.length > 1 ? 's' : ''} ${selected.join(' + ')} registrada${selected.length > 1 ? 's' : ''}. Aguarde a próxima etapa.`
                : question.isMultiSelect
                  ? 'Selecione todas as alternativas que considerar corretas e confirme.'
                  : 'Depois de enviada, a resposta não pode ser alterada.'}
            </p>
          </div>
        </div>
        {submitError && <p className="form-error text-center">{submitError}</p>}
      </section>
    </QuizBackdrop>
  )
}
