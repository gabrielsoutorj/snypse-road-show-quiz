import type { AnswerReveal, QuestionResult, QuestionSnapshot } from '../domain/build-two'
import { calculateAnswerPercentage } from '../domain/flow'

type Props = {
  question: QuestionSnapshot
  result: QuestionResult
  reveal?: AnswerReveal
}

export function ResultBoard({ question, result, reveal }: Props) {
  return (
    <div className="result-board">
      <p className="text-center text-sm font-black uppercase tracking-[0.22em] text-pink-400">
        Resultado da pergunta {question.position}
      </p>
      <div className="mt-6 grid gap-3">
        {question.options.map((option) => {
          const count = result.counts[option.label] ?? 0
          const percentage = calculateAnswerPercentage(count, result.totalAnswers)
          const isCorrect = reveal?.correctOptions.includes(option.label) ?? false
          return (
            <div key={option.id} className={`result-row ${isCorrect ? 'result-row-correct' : ''}`}>
              <span className="result-label">{option.label}</span>
              <div className="min-w-0 flex-1">
                <div className="result-copy-row">
                  <p className="result-answer-text">{option.text}</p>
                  <p className="result-percentage">{percentage}%</p>
                </div>
                <div className="result-track mt-3">
                  <span style={{ width: `${percentage}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {reveal?.insightBody && (
        <div className="result-insight">
          <span>✦</span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-pink-400">
              {reveal.insightTitle ?? 'Insight'}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">{reveal.insightBody}</p>
          </div>
        </div>
      )}
    </div>
  )
}
