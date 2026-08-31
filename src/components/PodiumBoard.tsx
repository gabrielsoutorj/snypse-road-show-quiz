import type { Participant } from '../domain/build-two'
import { ParticipantAvatar } from './ParticipantAvatar'

const podiumOrder = [1, 0, 2]

export function PodiumBoard({ ranking }: { ranking: Participant[] }) {
  return (
    <div className="podium-board">
      {podiumOrder.map((rankingIndex) => {
        const participant = ranking[rankingIndex]
        const position = rankingIndex + 1
        if (!participant) return null
        return (
          <div key={participant.id} className={`podium-place podium-place-${position}`}>
            <div className="podium-person">
              <span className="podium-medal">{position}</span>
              <ParticipantAvatar nickname={participant.nickname} size="large" />
              <p className="mt-3 max-w-52 truncate text-xl font-black">{participant.nickname}</p>
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
