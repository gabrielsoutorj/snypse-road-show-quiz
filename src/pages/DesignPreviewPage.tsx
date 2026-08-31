import { Navigate, useParams } from 'react-router-dom'
import type { Participant, QuestionSnapshot, SessionSnapshot } from '../domain/build-two'
import {
  ScreenLobbyStage,
  ScreenPodium,
  ScreenQuestion,
  ScreenRanking,
  ScreenResult,
} from './ScreenLobbyPage'
import { ParticipantQuestion } from './ParticipantLobbyPage'

const question: QuestionSnapshot = {
  id: 'preview-question',
  position: 1,
  title: 'Em qual ambiente a participação tende a ser mais ativa e conversacional?',
  supportText: 'Onde a marca entra como parte da conversa?',
  durationSeconds: 20,
  showRankingAfter: false,
  isMultiSelect: false,
  options: [
    { id: 'a', label: 'A', text: 'Instagram feed', position: 1 },
    { id: 'b', label: 'B', text: 'Discord', position: 2 },
    { id: 'c', label: 'C', text: 'Banner aleatório', position: 3 },
    { id: 'd', label: 'D', text: 'Stories sem contexto', position: 4 },
  ],
}

const ranking: Participant[] = [
  ['MariaFlor', 1350],
  ['Gabriel', 1210],
  ['RafaAds', 1080],
  ['LariMkt', 920],
  ['JoãoMídia', 870],
].map(([nickname, points], index) => ({
  id: `participant-${index}`,
  nickname: String(nickname),
  total_points: Number(points),
  correct_answers: 1,
  total_response_ms: 5000 + index * 700,
  joined_at: new Date(2026, 7, 30, 12, index).toISOString(),
  user_id: `user-${index}`,
}))

function previewSnapshot(phase: SessionSnapshot['session']['phase']): SessionSnapshot {
  const now = new Date()
  return {
    serverNow: now.toISOString(),
    role: 'host',
    session: {
      id: 'preview-session',
      pin: '824615',
      status: phase === 'ended' ? 'ended' : 'active',
      phase,
      phaseVersion: 4,
      currentQuestionId: question.id,
      questionOpenedAt: now.toISOString(),
      answerDeadlineAt: new Date(now.getTime() + 20_000).toISOString(),
    },
    participant: null,
    participants: ranking,
    questionCount: 12,
    question,
    answerCount: 87,
    result: { totalAnswers: 100, counts: { A: 12, B: 62, C: 17, D: 9 } },
    reveal: {
      correctOptions: ['B'],
      insightTitle: 'Insight',
      insightBody: 'No Discord, a marca entra no fluxo da conversa e participa de um consumo mais ativo — não de um scroll frio.',
    },
    ranking,
  }
}

export function DesignPreviewPage() {
  const { stage } = useParams()

  if (stage === 'lobby') {
    const snapshot = previewSnapshot('lobby')
    return (
      <ScreenLobbyStage
        snapshot={snapshot}
        joinUrl="http://127.0.0.1:5173/join/824615"
        onlineCount={ranking.length}
        onlineUserIds={new Set(ranking.map((participant) => participant.user_id!))}
        participants={ranking}
      />
    )
  }
  if (stage === 'question') return <ScreenQuestion snapshot={previewSnapshot('question_open')} />
  if (stage === 'result') return <ScreenResult snapshot={previewSnapshot('answer_reveal')} />
  if (stage === 'ranking') return <ScreenRanking snapshot={previewSnapshot('ranking')} />
  if (stage === 'podium') return <ScreenPodium snapshot={previewSnapshot('podium')} />
  if (stage === 'podium-solo') {
    const snapshot = previewSnapshot('podium')
    snapshot.ranking = ranking.slice(0, 1)
    return <ScreenPodium snapshot={snapshot} />
  }
  if (stage === 'result-long') {
    const snapshot = previewSnapshot('answer_reveal')
    snapshot.question = {
      ...question,
      position: 12,
      title: 'Quais afirmações sobre as soluções apresentadas no Road Show estão corretas?',
      isMultiSelect: true,
      options: [
        { id: 'a', label: 'A', text: 'A Smoot consegue interpretar contexto e emoção em texto, imagem e vídeo.', position: 1 },
        { id: 'b', label: 'B', text: 'A Magfi trabalha com curadoria e verificação de comunidades, Brand Safety e publicidade nativa.', position: 2 },
        { id: 'c', label: 'C', text: 'No Telegram, a marca entra em um ambiente de escolha e recorrência, enquanto no Discord entra em um ambiente de participação e conversa ativa.', position: 3 },
        { id: 'd', label: 'D', text: 'Smoot e Magfi atuam de forma complementar: uma conecta mídia ao contexto e ao momento, enquanto a outra conecta marcas a verticais e comunidades de afinidade.', position: 4 },
      ],
    }
    snapshot.reveal = { ...snapshot.reveal!, correctOptions: ['A', 'B', 'C', 'D'] }
    return <ScreenResult snapshot={snapshot} />
  }
  if (stage === 'mobile-question') {
    const snapshot = previewSnapshot('question_open')
    snapshot.role = 'participant'
    snapshot.participant = ranking[0]
    snapshot.question = {
      ...question,
      position: 12,
      title: 'Quais afirmações sobre as soluções apresentadas no Road Show estão corretas?',
      supportText: 'Selecione todas as respostas corretas.',
      isMultiSelect: true,
      durationSeconds: 35,
      options: [
        { id: 'a', label: 'A', text: 'A Smoot interpreta contexto e emoção em texto, imagem e vídeo.', position: 1 },
        { id: 'b', label: 'B', text: 'A Magfi trabalha com curadoria, Brand Safety e publicidade nativa.', position: 2 },
        { id: 'c', label: 'C', text: 'Telegram representa escolha e recorrência; Discord representa participação e conversa ativa.', position: 3 },
        { id: 'd', label: 'D', text: 'Smoot conecta mídia ao contexto; Magfi conecta marcas a comunidades de afinidade.', position: 4 },
      ],
    }
    return (
      <ParticipantQuestion
        snapshot={snapshot}
        selected={[]}
        draftSelections={['A', 'B', 'C', 'D']}
        submitting={false}
        submitError={null}
        onSelect={() => undefined}
        onSubmitMulti={() => undefined}
      />
    )
  }
  if (stage === 'mobile') {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 p-4">
        <iframe
          title="Prévia mobile"
          src="./mobile-question"
          className="h-[667px] w-[390px] max-w-full border border-white/20 bg-black"
        />
      </main>
    )
  }
  return <Navigate to="/design-preview/lobby" replace />
}
