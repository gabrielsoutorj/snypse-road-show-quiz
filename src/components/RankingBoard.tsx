import type { Participant } from '../domain/build-two'
import { ParticipantAvatar } from './ParticipantAvatar'

export function RankingBoard({ ranking }: { ranking: Participant[] }) {
  return (
    <div className="ranking-board">
      {ranking.slice(0, 5).map((participant, index) => (
        <div key={participant.id} className={`ranking-row ranking-row-${index + 1}`}>
          <span className="ranking-position">{index + 1}</span>
          <ParticipantAvatar nickname={participant.nickname} size={index < 3 ? 'large' : undefined} />
          <p className="min-w-0 flex-1 truncate text-xl font-black">{participant.nickname}</p>
          <p className="ranking-points">{participant.total_points.toLocaleString('pt-BR')}</p>
        </div>
      ))}
      {ranking.length === 0 && <p className="py-12 text-center text-zinc-500">O ranking aparecerá após as respostas.</p>}
    </div>
  )
}
