import { describe, expect, it } from 'vitest'
import { calculateAnswerPercentage, getHostFlowAction } from './flow'

describe('host quiz flow', () => {
  it('keeps result and reveal as separate presenter actions', () => {
    expect(getHostFlowAction('answers_closed', 1, 8, false)?.command).toBe('show_result')
    expect(getHostFlowAction('question_result', 1, 8, false)?.command).toBe('reveal_answer')
  })

  it('uses the predefined ranking checkpoints', () => {
    expect(getHostFlowAction('answer_reveal', 2, 8, true)?.command).toBe('show_ranking')
    expect(getHostFlowAction('answer_reveal', 3, 8, false)?.command).toBe('start_question')
  })

  it('shows the podium after the final reveal', () => {
    expect(getHostFlowAction('answer_reveal', 8, 8, false)?.command).toBe('show_podium')
  })
})

describe('answer percentages', () => {
  it('rounds percentages and handles empty rooms', () => {
    expect(calculateAnswerPercentage(5, 8)).toBe(63)
    expect(calculateAnswerPercentage(3, 0)).toBe(0)
  })
})
