export function calculateRemainingMs(
  deadlineAt: string | null,
  serverOffsetMs = 0,
  clientNowMs = Date.now(),
) {
  if (!deadlineAt) return 0

  const deadlineMs = Date.parse(deadlineAt)
  if (!Number.isFinite(deadlineMs)) return 0

  return Math.max(0, deadlineMs - (clientNowMs + serverOffsetMs))
}

export function calculateServerOffsetMs(serverNow: string, clientNowMs = Date.now()) {
  const serverNowMs = Date.parse(serverNow)
  return Number.isFinite(serverNowMs) ? serverNowMs - clientNowMs : 0
}
