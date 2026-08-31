import { describe, expect, it } from 'vitest'
import { isLoopbackHostname } from './network'

describe('isLoopbackHostname', () => {
  it('identifies addresses that cannot be opened from another phone', () => {
    expect(isLoopbackHostname('localhost')).toBe(true)
    expect(isLoopbackHostname('127.0.0.1')).toBe(true)
    expect(isLoopbackHostname('::1')).toBe(true)
  })

  it('accepts LAN addresses and hosted domains', () => {
    expect(isLoopbackHostname('192.168.1.25')).toBe(false)
    expect(isLoopbackHostname('quiz.snypse.com')).toBe(false)
  })
})
