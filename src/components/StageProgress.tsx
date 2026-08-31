export type PresentationStage = 'lobby' | 'quiz' | 'ranking' | 'podium'

const stages: Array<{ id: PresentationStage; label: string; icon: string }> = [
  { id: 'lobby', label: 'Lobby', icon: '◎' },
  { id: 'quiz', label: 'Quiz', icon: '▥' },
  { id: 'ranking', label: 'Ranking', icon: '♜' },
  { id: 'podium', label: 'Pódio final', icon: '★' },
]

export function StageProgress({ active }: { active: PresentationStage }) {
  return (
    <footer className="stage-progress" aria-label="Progresso da apresentação">
      {stages.map((stage, index) => (
        <div key={stage.id} className={`stage-progress-item ${active === stage.id ? 'stage-progress-active' : ''}`}>
          {index > 0 && <span className="stage-progress-line" />}
          <span className="stage-progress-icon">{stage.icon}</span>
          <span className="stage-progress-label">{stage.label}</span>
        </div>
      ))}
    </footer>
  )
}
