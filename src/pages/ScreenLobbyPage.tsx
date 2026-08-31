import QRCode from 'react-qr-code'
import { Navigate, useParams } from 'react-router-dom'
import { ErrorPage, LoadingPage } from '../components/PageState'
import { ParticipantAvatar } from '../components/ParticipantAvatar'
import { PinDisplay } from '../components/PinDisplay'
import { PodiumBoard } from '../components/PodiumBoard'
import { QuestionOptions } from '../components/QuestionOptions'
import { QuestionTimer } from '../components/QuestionTimer'
import { RankingBoard } from '../components/RankingBoard'
import { ResultBoard } from '../components/ResultBoard'
import { QuizBackdrop } from '../components/QuizBackdrop'
import { useCountdown } from '../hooks/use-countdown'
import { useSessionLobby } from '../hooks/use-session-lobby'
import { publicAppUrl } from '../lib/public-url'

export function ScreenLobbyPage() {
  const { sessionId } = useParams()
  if (!sessionId) return <Navigate to="/session-invalid" replace />
  return <ScreenLobby sessionId={sessionId} />
}

function ScreenLobby({ sessionId }: { sessionId: string }) {
  const { snapshot, onlineUserIds, onlineCount, loading, error } = useSessionLobby(sessionId)

  if (loading) return <LoadingPage message="Sincronizando o telão…" />
  if (error || !snapshot) {
    return <ErrorPage title="Telão indisponível" message={error ?? 'Sessão não encontrada.'} />
  }
  if (snapshot.role !== 'host') {
    return <ErrorPage title="Acesso necessário" message="Abra o telão pelo painel do apresentador." />
  }

  if (snapshot.question) {
    if (snapshot.session.phase === 'question_open' || snapshot.session.phase === 'answers_closed') {
      return <ScreenQuestion snapshot={snapshot} />
    }
    if ((snapshot.session.phase === 'question_result' || snapshot.session.phase === 'answer_reveal') && snapshot.result) {
      return <ScreenResult snapshot={snapshot} />
    }
    if (snapshot.session.phase === 'ranking') {
      return <ScreenRanking snapshot={snapshot} />
    }
    if (snapshot.session.phase === 'podium' || snapshot.session.phase === 'ended') {
      return <ScreenPodium snapshot={snapshot} />
    }
  }

  const participants = snapshot.participants ?? []
  const joinUrl = publicAppUrl(`join/${snapshot.session.pin}`)

  return (
    <ScreenLobbyStage
      snapshot={snapshot}
      joinUrl={joinUrl}
      onlineCount={onlineCount}
      onlineUserIds={onlineUserIds}
      participants={participants}
    />
  )
}

export function ScreenLobbyStage({
  snapshot,
  joinUrl,
  onlineCount,
  onlineUserIds,
  participants,
}: {
  snapshot: NonNullable<ReturnType<typeof useSessionLobby>['snapshot']>
  joinUrl: string
  onlineCount: number
  onlineUserIds: Set<string>
  participants: NonNullable<NonNullable<ReturnType<typeof useSessionLobby>['snapshot']>['participants']>
}) {
  return (
    <QuizBackdrop stage="lobby">
      <section className="screen-stage screen-lobby-stage grid flex-1 items-center gap-8 py-5 lg:grid-cols-[1.32fr_0.68fr]">
        <div>
          <h1 className="screen-display whitespace-nowrap text-6xl font-black uppercase leading-[0.86] sm:text-7xl xl:text-[7.5rem]">
            Quiz <span className="neon-title">Road Show</span>
          </h1>
          <div className="screen-title-rule mt-5"><span />Atenção, contexto e comunidades<span /></div>

          <div className="screen-pin-panel mt-7 rounded-3xl border border-pink-500/60 bg-zinc-950/90 p-6 shadow-[0_0_45px_rgba(236,0,112,0.14)] sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-pink-400">Código para entrar</p>
                <div className="mt-3"><PinDisplay pin={snapshot.session.pin} /></div>
              </div>
              <span className="live-badge"><span className="size-2 rounded-full bg-emerald-400" />{onlineCount} online</span>
            </div>

            <div className="mt-7 border-t border-white/10 pt-6">
              <div className="flex flex-wrap gap-3">
                {participants.length > 0 ? (
                  participants.slice(0, 18).map((participant) => (
                    <div key={participant.id} className="screen-participant-chip">
                      <ParticipantAvatar
                        nickname={participant.nickname}
                        size="small"
                        online={participant.user_id ? onlineUserIds.has(participant.user_id) : undefined}
                      />
                      <span>{participant.nickname}</span>
                    </div>
                  ))
                ) : (
                  <p className="py-5 text-lg text-zinc-500">Os participantes aparecerão aqui em tempo real.</p>
                )}
                {participants.length > 18 && (
                  <span className="screen-participant-chip px-5">+{participants.length - 18}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="neon-panel screen-qr-panel text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">QR para entrar</p>
          <div className="mx-auto mt-7 w-fit rounded-3xl bg-white p-5 shadow-[0_0_45px_rgba(0,149,255,0.3)]">
            <QRCode value={joinUrl} size={230} bgColor="#ffffff" fgColor="#050505" level="M" />
          </div>
          <p className="mt-7 text-lg text-zinc-300">Aponte a câmera do celular</p>
          <p className="mt-2 text-sm text-zinc-500">Premiação para os 3 primeiros colocados</p>
        </aside>
      </section>
    </QuizBackdrop>
  )
}

export function ScreenResult({
  snapshot,
}: {
  snapshot: NonNullable<ReturnType<typeof useSessionLobby>['snapshot']>
}) {
  const question = snapshot.question!
  const revealedOptions = snapshot.reveal
    ? question.options.filter((option) => snapshot.reveal?.correctOptions.includes(option.label))
    : []

  return (
    <QuizBackdrop stage="quiz">
      <section className="screen-stage grid flex-1 items-center gap-10 py-5 lg:grid-cols-[0.38fr_1fr]">
        <aside>
          <p className="screen-display text-[5.5rem] font-black uppercase leading-[0.86] xl:text-[7.4rem]">
            {snapshot.reveal ? 'Resposta' : 'Resultado'}
          </p>
          <p className="screen-display neon-title mt-3 break-words text-5xl font-black uppercase leading-none xl:text-7xl">
            {revealedOptions.length === 1 ? revealedOptions[0].text : revealedOptions.map((option) => option.label).join(' + ') || `Pergunta ${question.position}`}
          </p>
          <div className="mt-7 h-px w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400" />
          <p className="mt-7 text-2xl font-light leading-snug text-zinc-300">
            {snapshot.reveal ? 'Participação ativa. Conversa real. Comunidade.' : 'Veja como a sala respondeu.'}
          </p>
        </aside>

        <div className="neon-panel">
          <ResultBoard question={question} result={snapshot.result!} reveal={snapshot.reveal} />
        </div>
      </section>
    </QuizBackdrop>
  )
}

export function ScreenRanking({
  snapshot,
}: {
  snapshot: NonNullable<ReturnType<typeof useSessionLobby>['snapshot']>
}) {
  return (
    <QuizBackdrop stage="ranking">
      <section className="screen-stage grid flex-1 items-center gap-10 py-5 lg:grid-cols-[0.42fr_1fr]">
        <aside>
          <p className="screen-display text-[6rem] font-black uppercase leading-[0.86] xl:text-[8rem]">Ranking</p>
          <p className="screen-display neon-title mt-3 text-[5rem] font-black uppercase leading-none xl:text-[7rem]">Parcial</p>
          <div className="mt-8 h-px w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400" />
          <p className="mt-7 text-2xl font-light text-zinc-300">Os 5 primeiros colocados até aqui.</p>
        </aside>
        <div className="neon-panel"><RankingBoard ranking={snapshot.ranking ?? []} /></div>
      </section>
    </QuizBackdrop>
  )
}

export function ScreenPodium({
  snapshot,
}: {
  snapshot: NonNullable<ReturnType<typeof useSessionLobby>['snapshot']>
}) {
  return (
    <QuizBackdrop stage="podium">
      <section className="screen-stage grid flex-1 items-center gap-8 py-4 lg:grid-cols-[0.3fr_1fr]">
        <aside>
          <p className="screen-display text-[6rem] font-black uppercase leading-[0.86] xl:text-[8rem]">Pódio</p>
          <p className="screen-display neon-title mt-3 text-[5rem] font-black uppercase leading-none xl:text-[7rem]">Final</p>
          <div className="mt-8 h-px w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400" />
          <p className="mt-7 text-2xl font-light text-zinc-300">Parabéns aos três primeiros colocados.</p>
        </aside>
        <div>
          <PodiumBoard ranking={snapshot.ranking ?? []} />
          <div className="podium-cta mt-5 rounded-2xl border border-pink-500/50 bg-black/70 px-6 py-4 text-center">
            <p className="text-2xl font-black">Agora é com <span className="text-pink-500">vocês.</span></p>
            <p className="mt-1 text-zinc-400">Onde existe atenção relevante para a sua marca?</p>
          </div>
        </div>
      </section>
    </QuizBackdrop>
  )
}

export function ScreenQuestion({
  snapshot,
}: {
  snapshot: NonNullable<ReturnType<typeof useSessionLobby>['snapshot']>
}) {
  const question = snapshot.question!
  const { remainingSeconds, expired } = useCountdown(
    snapshot.session.answerDeadlineAt,
    snapshot.serverNow,
  )
  const closed = snapshot.session.phase !== 'question_open' || expired

  return (
    <QuizBackdrop stage="quiz">
      <section className="screen-stage grid flex-1 items-center gap-8 py-5 lg:grid-cols-[0.35fr_1fr]">
        <aside>
          <p className="screen-display whitespace-nowrap text-[4.4rem] font-black uppercase leading-none xl:text-[5.6rem]">
            Pergunta <span className="text-pink-500">{question.position}</span>
          </p>
          <div className="mt-5 h-px w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400" />
          {question.supportText && (
            <p className="mt-7 text-2xl font-light leading-snug text-zinc-300">{question.supportText}</p>
          )}
        </aside>

        <div>
          <div className="flex items-center justify-end gap-7 pb-5">
            <p className="text-2xl font-black tabular-nums">
              <span className="text-pink-500">{String(question.position).padStart(2, '0')}</span>
              <span className="mx-3 text-zinc-600">/</span>
              {String(snapshot.questionCount).padStart(2, '0')}
            </p>
            <QuestionTimer seconds={remainingSeconds} durationSeconds={question.durationSeconds} />
          </div>

          <div className="neon-panel question-prompt-panel flex items-center gap-7 px-8 py-7 lg:px-10">
            <span className="question-bubble">?</span>
            <h1 className="text-3xl font-black leading-tight lg:text-[2.15rem] xl:text-[2.4rem]">{question.title}</h1>
          </div>

          <div className="mt-7">
            <QuestionOptions options={question.options} screen />
          </div>

          <div className={`screen-question-status ${closed ? 'screen-question-status-closed' : ''}`}>
            <span className={`size-3 rounded-full ${closed ? 'bg-pink-500' : 'bg-emerald-400'}`} />
            {closed
              ? 'Respostas encerradas'
              : `${snapshot.answerCount ?? 0} respostas recebidas`}
          </div>
        </div>
      </section>
    </QuizBackdrop>
  )
}
