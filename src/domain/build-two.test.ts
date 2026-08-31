import { describe, expect, it } from 'vitest'
import {
  isValidPin,
  normalizeNickname,
  normalizePin,
  validateNickname,
} from './build-two'

describe('Build 2 input rules', () => {
  it('keeps only the first six PIN digits', () => {
    expect(normalizePin('82a4 6159')).toBe('824615')
    expect(isValidPin('824615')).toBe(true)
    expect(isValidPin('82461')).toBe(false)
  })

  it('normalizes nickname whitespace', () => {
    expect(normalizeNickname('  Maria   Flor')).toBe('Maria Flor')
    expect(validateNickname('M')).toBeTruthy()
    expect(validateNickname('Maria Flor')).toBeNull()
  })
})
