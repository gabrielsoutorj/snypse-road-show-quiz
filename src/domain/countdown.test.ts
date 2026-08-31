import { describe, expect, it } from 'vitest'
import { calculateRemainingMs, calculateServerOffsetMs } from './countdown'

describe('countdown', () => {
  it('uses the server clock offset when calculating the deadline', () => {
    const clientNow = Date.parse('2026-08-30T12:00:00.000Z')
    const offset = calculateServerOffsetMs('2026-08-30T12:00:02.000Z', clientNow)

    expect(offset).toBe(2_000)
    expect(
      calculateRemainingMs('2026-08-30T12:00:20.000Z', offset, clientNow),
    ).toBe(18_000)
  })

  it('never returns a negative value', () => {
    expect(
      calculateRemainingMs(
        '2026-08-30T11:59:59.000Z',
        0,
        Date.parse('2026-08-30T12:00:00.000Z'),
      ),
    ).toBe(0)
  })

  it('returns zero without a valid deadline', () => {
    expect(calculateRemainingMs(null)).toBe(0)
    expect(calculateRemainingMs('not-a-date')).toBe(0)
  })
})
