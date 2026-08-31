import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorPage, LoadingPage } from '../components/PageState'
import { ParticipantAvatar } from '../components/ParticipantAvatar'
import { PinDisplay } from '../components/PinDisplay'
import { PodiumBoard } from '../components/PodiumBoard'
import { QuestionOptions } from '../components/QuestionOptions'
import { QuestionTimer } from '../components/QuestionTimer'
import { RankingBoard } from '../components/RankingBoard'
import { ResultBoard } from '../components/ResultBoard'
import { QuizBackdrop } from '../components/QuizBackdrop'
import { friendlyQuizError } from '../domain/build-two'
import { getHostFlowAction } from '../domain/flow'
import { isLoopbackHostname } from '../domain/network'
import type { HostCommand } from '../domain/session'
import { useCountdown } from '../hooks/use-countdown'
import { useSessionLobby } from '../hooks/use-session-lobby'
import { quizApi } from '../lib/quiz-api'
import { publicAppUrl } from '../lib/public-url'

export function HostLobbyPage() {
  const { sessionId } = useParams()
  if (!sessionId) return <Navigate to="/host" replace />
  return <HostLobby sessionId={sessionId} />
}

function HostLobby({ sessionId }: { sessionId: string }) {
  const { snapshot, onlineUserIds, onlineCount, loading, error, refresh } = useSessionLobby(sessionId)
  const [copied, setCopied] = useState(false)
  const [commandPending, setCommandPending] = useState(false)
  const [commandError, setCommandError] = useState<string | null>(null)

  const joinUrl = useMemo(() => {
    if (!snapshot) return ''
    return publicAppUrl(`join/${snapshot.session.pin}`)
  }, [snapshot])
  const joinUrlIsLocalOnly = isLoopbackHostname(window.location.hostname)

  useEffect(() => {
    setCommandError(null)
  }, [snapshot?.session.phaseVersion])

  if (loading) return <LoadingPage message="Preparando o lobby…" />
  if (error || !snapshot) {
    return <ErrorPage title="Lobby indisponível" message={error ?? 'Sessão não encontrada.'} />
  }
  if (snapshot.role !== 'host') {
    return <ErrorPage title="Acesso do apresentador" message="Somente quem criou a sessão pode abrir este painel." />
  }

  async function runCommand(command: HostCommand | 'close_answers') {
    if (!snapshot || commandPending) return
    setCommandPending(true)
    setCommandError(null)
    try {
      await quizApi.hostCommand(sessionId, command, snapshot.session.phaseVersion)
      await refresh()
    } catch (reason) {
      setCommandError(friendlyQuizError(reason))
      await refresh().catch(() => undefined)
    } finally {
      setCommandPending(false)
    }
  }

  if (snapshot.session.phase !== 'lobby' && snapshot.question) {
    return (
      <HostQuestionControl
        snapshot={snapshot}
        pending={commandPending}
        error={commandError}
        onCommand={runCommand}
      />
    )
  }

  const participants = snapshot.participants ?? []

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <QuizBackdrop>
      <section className="grid flex-1 gap-6 py-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="neon-panel flex min-h-[34rem] flex-col">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-pink-400">Lobby ao vivo</p>
              <h1 className="mt-2 text-4xl font-black uppercase">Participantes</h1>
            </div>
            <span className="live-badge">
              <span className="size-2 rounded-full bg-emerald-400" />
              {onlineCount} online
            </span>
          </div>

          {participants.length > 0 ? (
            <div className="mt-6 grid max-h-[30rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {participants.map((participant, index) => (
                <div key={participant.id} className="participant-row">
                  <ParticipantAvatar
                    nickname={participant.nickname}
                    online={participant.user_id ? onlineUserIds.has(participant.user_id) : undefined}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{participant.nickname}</p>
                    <p className="mt-1 text-xs text-zinc-500">Participante {index + 1}</p>
                  </div>
                  <span className="ml-auto text-emerald-400">✓</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid flex-1 place-items-center py-12 text-center">
              <div>
                <span className="loading-ring mx-auto" />
                <h2 className="mt-7 text-2xl font-black uppercase">Aguardando entradas</h2>
                <p className="mt-2 text-zinc-500">Os nicknames aparecerão aqui automaticamente.</p>
              </div>
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <p className="text-sm text-zinc-400">
              <strong className="text-white">{participants.length}</strong>{' '}
              {participants.length === 1 ? 'participante na sala' : 'participantes na sala'}
            </p>
            <button
              type="button"
              className="primary-action"
              disabled={commandPending || participants.length === 0}
              onClick={() => void runCommand('start_question')}
              title={participants.length === 0 ? 'Aguarde pelo menos um participante' : undefined}
            >
              {commandPending ? 'Iniciando…' : 'Iniciar quiz'}
            </button>
          </div>
          {commandError && <p className="form-error text-right">{commandError}</p>}
        </div>

        <aside className="neon-panel flex flex-col justify-between text-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">Código para entrar</p>
            <div className="mt-4">
              <PinDisplay pin={snapshot.session.pin} />
            </div>

            <div className="mx-auto mt-7 w-fit rounded-2xl bg-white p-4 shadow-[0_0_35px_rgba(0,149,255,0.28)]">
              <QRCode value={joinUrl} size={190} bgColor="#ffffff" fgColor="#050505" level="M" />
            </div>
            <p className="mt-5 text-sm text-zinc-400">Aponte a câmera do celular para entrar.</p>
            {joinUrlIsLocalOnly && (
              <div className="config-notice mt-5 text-left">
                <span className="config-dot" />
                Para o QR funcionar nos celulares, abra esta página pelo IP da rede do notebook ou por um domínio publicado.
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-3">
            <button type="button" onClick={copyLink} className="secondary-action w-full">
              {copied ? 'Link copiado ✓' : 'Copiar link de entrada'}
            </button>
            <Link to={`/screen/${sessionId}`} target="_blank" className="primary-action inline-flex justify-center">
              Abrir telão
            </Link>
          </div>
        </aside>
      </section>
    </QuizBackdrop>
  )
}

type HostQuestionControlProps = {
  snapshot: NonNullable<ReturnType<typeof useSessionLobby>['snapshot']>
  pending: boolean
  error: string | null
  onCommand: (command: HostCommand | 'close_answers') => Promise<void>
}

function HostQuestionControl({ snapshot, pending, error, onCommand }: HostQuestionControlProps) {
  const question = snapshot.question!
  const { remainingSeconds, expired } = useCountdown(
    snapshot.session.answerDeadlineAt,
    snapshot.serverNow,
  )
  const autoCloseVersion = useRef<number | null>(null)
  const onCommandRef = useRef(onCommand)
  const isOpen = snapshot.session.phase === 'question_open'
  const action = getHostFlowAction(
    snapshot.session.phase,
    question.position,
    snapshot.questionCount,
    question.showRankingAfter,
  )

  useEffect(() => {
    onCommandRef.current = onCommand
  }, [onCommand])

  useEffect(() => {
    if (!isOpen || !expired || autoCloseVersion.current === snapshot.session.phaseVersion) return
    const version = snapshot.session.phaseVersion
    const settleTimer = window.setTimeout(() => {
      if (autoCloseVersion.current === version) return
      autoCloseVersion.current = version
      void onCommandRef.current('close_answers')
    }, 2_200)
    return () => window.clearTimeout(settleTimer)
  }, [expired, isOpen, snapshot.session.phaseVersion])

  const phaseLabel = {
    question_open: 'Pergunta aberta',
    answers_closed: 'Respostas encerradas',
    question_result: 'Resultado da sala',
    answer_reveal: 'Resposta revelada',
    ranking: 'Ranking parcial',
    podium: 'Pódio final',
    ended: 'Sessão encerrada',
    lobby: 'Lobby',
  }[snapshot.session.phase]

  return (
    <QuizBackdrop>
      <section className="grid flex-1 gap-6 py-6 xl:grid-cols-[1fr_0.48fr]">
        <div className="neon-panel flex min-h-[38rem] flex-col">
          {(snapshot.session.phase === 'question_open' || snapshot.session.phase === 'answers_closed') && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-pink-400">
                    Pergunta {question.position} de {snapshot.questionCount}
                  </p>
                  <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight lg:text-4xl">{question.title}</h1>
                </div>
                <QuestionTimer seconds={remainingSeconds} durationSeconds={question.durationSeconds} />
              </div>

              <div className="mt-6">
                <QuestionOptions options={question.options} />
              </div>
              {question.supportText && <p className="mt-6 text-lg text-zinc-400">{question.supportText}</p>}
            </>
          )}

          {(snapshot.session.phase === 'question_result' || snapshot.session.phase === 'answer_reveal') && snapshot.result && (
            <ResultBoard question={question} result={snapshot.result} reveal={snapshot.reveal} />
          )}

          {snapshot.session.phase === 'ranking' && (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-pink-400">Ranking parcial</p>
              <h1 className="mt-2 text-5xl font-black uppercase">Os 5 primeiros</h1>
              <div className="mt-7"><RankingBoard ranking={snapshot.ranking ?? []} /></div>
            </div>
          )}

          {(snapshot.session.phase === 'podium' || snapshot.session.phase === 'ended') && (
            <div className="flex flex-1 flex-col">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-pink-400">Pódio final</p>
              <h1 className="mt-2 text-5xl font-black uppercase">Vencedores</h1>
              <div className="host-podium-shell"><PodiumBoard ranking={snapshot.ranking ?? []} /></div>
            </div>
          )}
        </div>

        <aside className="neon-panel flex flex-col">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-400">Controle da rodada</p>
          <div className="mt-8 text-center">
            <p className="text-3xl font-black uppercase">{phaseLabel}</p>
            {snapshot.session.phase === 'podium' || snapshot.session.phase === 'ended' ? (
              <div className="host-finale-summary">
                <span>★</span>
                <p>Vencedores no telão</p>
                <small>Parabéns aos primeiros colocados</small>
              </div>
            ) : (
              <>
                <p className="mt-6 text-7xl font-black tabular-nums">{snapshot.answerCount ?? 0}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.18em] text-zinc-500">respostas na pergunta</p>
                <p className="mt-5 text-sm text-zinc-400">
                  de {snapshot.participants?.length ?? 0} participantes
                </p>
              </>
            )}
          </div>

          <div className="mt-auto pt-8">
            {action ? (
              <button
                type="button"
                className="primary-action w-full"
                disabled={pending}
                onClick={() => void onCommand(action.command)}
              >
                {pending ? 'Atualizando…' : action.label}
              </button>
            ) : (
              <div className="answer-status answer-status-confirmed">
                <span className="answer-status-icon">✓</span>
                <div>
                  <p className="font-black uppercase tracking-[0.12em]">Quiz concluído</p>
                  <p className="mt-1 text-xs text-zinc-500">A sessão foi encerrada com sucesso.</p>
                </div>
              </div>
            )}
            {error && <p className="form-error text-center">{error}</p>}
          </div>
        </aside>
      </section>
    </QuizBackdrop>
  )
}
