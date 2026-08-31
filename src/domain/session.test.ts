import { describe, expect, it } from 'vitest'
import { calculatePoints } from './session'

describe('calculatePoints', () => {
  it('awards zero for an incorrect answer', () => {
    expect(calculatePoints(false, 100, 20_000)).toBe(0)
  })

  it('awards the maximum for an immediate correct answer', () => {
    expect(calculatePoints(true, 0, 20_000)).toBe(1_000)
  })

  it('awards the approved minimum at the deadline', () => {
    expect(calculatePoints(true, 20_000, 20_000)).toBe(500)
  })

  it('clamps response times to the valid range', () => {
    expect(calculatePoints(true, -500, 20_000)).toBe(1_000)
    expect(calculatePoints(true, 99_000, 20_000)).toBe(500)
  })
})
