import type { Participant } from '../domain/build-two'
import { ParticipantAvatar } from './ParticipantAvatar'

export function RankingBoard({ ranking }: { ranking: Participant[] }) {
  return (
    <div className="ranking-board">
      {ranking.slice(0, 5).map((participant, index) => (
        <div key={participant.id} className={`ranking-row ranking-row-${index + 1}`}>
          <div className="ranking-position">
            <span className="ranking-medal-icon">{index === 0 ? '★' : index + 1}</span>
            <small>{index === 0 ? 'líder' : 'posição'}</small>
          </div>
          <ParticipantAvatar nickname={participant.nickname} size={index < 3 ? 'large' : undefined} />
          <div className="ranking-identity">
            <p>{participant.nickname}</p>
            <span>{participant.correct_answers} {participant.correct_answers === 1 ? 'acerto' : 'acertos'}</span>
          </div>
          <div className="ranking-score">
            <p className="ranking-points">{participant.total_points.toLocaleString('pt-BR')}</p>
            <span>pontos</span>
          </div>
        </div>
      ))}
      {ranking.length === 0 && <p className="py-12 text-center text-zinc-500">O ranking aparecerá após as respostas.</p>}
    </div>
  )
}
