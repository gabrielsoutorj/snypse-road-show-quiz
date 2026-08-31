import { useEffect, useMemo, useState } from 'react'
import { calculateRemainingMs, calculateServerOffsetMs } from '../domain/countdown'

export function useCountdown(deadlineAt: string | null, serverNow: string) {
  const serverOffsetMs = useMemo(
    () => calculateServerOffsetMs(serverNow),
    [serverNow],
  )
  const [clientNowMs, setClientNowMs] = useState(() => Date.now())

  useEffect(() => {
    function tick() {
      setClientNowMs(Date.now())
    }

    tick()
    const interval = window.setInterval(tick, 100)
    return () => window.clearInterval(interval)
  }, [deadlineAt, serverOffsetMs])

  // Calculated during render so a new question can never inherit the expired
  // value kept by the previous question for one React render.
  const remainingMs = calculateRemainingMs(deadlineAt, serverOffsetMs, clientNowMs)

  return {
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1_000),
    expired: remainingMs <= 0,
  }
}
