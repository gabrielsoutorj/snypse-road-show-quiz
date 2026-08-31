import type { Participant } from '../domain/build-two'
import { ParticipantAvatar } from './ParticipantAvatar'

const podiumOrder = [1, 0, 2]

export function PodiumBoard({ ranking }: { ranking: Participant[] }) {
  if (ranking.length === 1) {
    const winner = ranking[0]
    return (
      <div className="podium-board podium-board-solo">
        <div className="podium-solo-card">
          <div className="podium-crown" aria-hidden="true">♛</div>
          <div className="podium-solo-avatar"><ParticipantAvatar nickname={winner.nickname} size="large" /></div>
          <p className="podium-solo-kicker">1º lugar</p>
          <p className="podium-solo-name">{winner.nickname}</p>
          <p className="podium-solo-points">{winner.total_points.toLocaleString('pt-BR')} <small>pontos</small></p>
          <div className="podium-solo-stage"><span>1</span></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`podium-board podium-board-${Math.min(ranking.length, 3)}`}>
      {podiumOrder.map((rankingIndex) => {
        const participant = ranking[rankingIndex]
        const position = rankingIndex + 1
        if (!participant) return null
        return (
          <div key={participant.id} className={`podium-place podium-place-${position}`}>
            <div className="podium-person">
              <span className="podium-medal">{position}</span>
              <ParticipantAvatar nickname={participant.nickname} size="large" />
              <p className="podium-name">{participant.nickname}</p>
              <p className="mt-1 font-black text-pink-400">
                {participant.total_points.toLocaleString('pt-BR')} <small className="font-medium text-zinc-400">pontos</small>
              </p>
            </div>
            <div className="podium-block"><span>{position}</span></div>
          </div>
        )
      })}
    </div>
  )
}
