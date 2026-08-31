import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionSnapshot } from '../domain/build-two'
import { friendlyQuizError } from '../domain/build-two'
import { quizApi } from '../lib/quiz-api'
import {
  subscribeToSession,
  unsubscribeFromSession,
} from '../lib/session-realtime'
import { ensureAnonymousSession } from '../lib/supabase'

export function useSessionLobby(sessionId: string) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null)
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const snapshotRef = useRef<SessionSnapshot | null>(null)
  const refreshRequestRef = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestRef.current
    try {
      const next = await quizApi.snapshot(sessionId)
      // Realtime can trigger several snapshots at once. An older, slower
      // response must never overwrite a newer answer count.
      if (requestId === refreshRequestRef.current) {
        snapshotRef.current = next
        setSnapshot(next)
        setError(null)
      }
      return next
    } catch (reason) {
      if (!snapshotRef.current) setError(friendlyQuizError(reason))
      throw reason
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    let disposed = false
    let channel: Awaited<ReturnType<typeof subscribeToSession>> | null = null

    async function connect() {
      try {
        const initial = await refresh()
        if (disposed) return

        const authSession = await ensureAnonymousSession()
        channel = await subscribeToSession({
          sessionId,
          presence: {
            userId: authSession.user.id,
            role: initial.role,
            nickname: initial.participant?.nickname,
            onlineAt: new Date().toISOString(),
          },
          onInvalidate: () => {
            void refresh().catch(() => undefined)
          },
          onPresenceSync: (state) => {
            if (disposed) return
            const ids = Object.values(state)
              .flat()
              .map((presence) => presence.userId)
            setOnlineUserIds(new Set(ids))
          },
        })
      } catch {
        // The translated error is already exposed through state.
      }
    }

    void connect()

    return () => {
      disposed = true
      if (channel) void unsubscribeFromSession(channel)
    }
  }, [refresh, sessionId])

  useEffect(() => {
    if (snapshot?.role !== 'host' || snapshot.session.phase !== 'question_open') return

    // Broadcasts make the UI feel live; this lightweight host-only check makes
    // the visible total self-healing if a mobile connection drops an event.
    const countCheck = window.setInterval(() => {
      void refresh().catch(() => undefined)
    }, 800)

    return () => window.clearInterval(countCheck)
  }, [refresh, snapshot?.role, snapshot?.session.phase])

  return {
    snapshot,
    onlineUserIds,
    onlineCount: onlineUserIds.size,
    loading,
    error,
    refresh,
  }
}
