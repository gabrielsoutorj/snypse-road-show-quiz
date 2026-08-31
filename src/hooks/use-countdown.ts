import { useEffect, useMemo, useState } from 'react'
import { calculateRemainingMs, calculateServerOffsetMs } from '../domain/countdown'

export function useCountdown(deadlineAt: string | null, serverNow: string) {
  const serverOffsetMs = useMemo(
    () => calculateServerOffsetMs(serverNow),
    [serverNow],
  )
  const [remainingMs, setRemainingMs] = useState(() =>
    calculateRemainingMs(deadlineAt, serverOffsetMs),
  )

  useEffect(() => {
    function tick() {
      setRemainingMs(calculateRemainingMs(deadlineAt, serverOffsetMs))
    }

    tick()
    const interval = window.setInterval(tick, 100)
    return () => window.clearInterval(interval)
  }, [deadlineAt, serverOffsetMs])

  return {
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1_000),
    expired: remainingMs <= 0,
  }
}
