import type { RealtimeChannel } from '@supabase/supabase-js'
import { ensureAnonymousSession, supabase } from './supabase'

type PresencePayload = {
  userId: string
  role: 'host' | 'participant'
  nickname?: string
  onlineAt: string
}

type SessionRealtimeOptions = {
  sessionId: string
  presence: PresencePayload
  onInvalidate: () => void
  onPresenceSync?: (state: Record<string, PresencePayload[]>) => void
}

const SESSION_EVENTS = [
  'participant_joined',
  'answer_count_changed',
  'phase_changed',
] as const

export async function subscribeToSession({
  sessionId,
  presence,
  onInvalidate,
  onPresenceSync,
}: SessionRealtimeOptions): Promise<RealtimeChannel> {
  const session = await ensureAnonymousSession()
  await supabase.realtime.setAuth(session.access_token)

  const channel = supabase.channel(`session:${sessionId}`, {
    config: {
      private: true,
      presence: { key: presence.userId },
    },
  })

  for (const event of SESSION_EVENTS) {
    channel.on('broadcast', { event }, onInvalidate)
  }

  channel.on('presence', { event: 'sync' }, () => {
    onPresenceSync?.(
      channel.presenceState<PresencePayload>() as Record<string, PresencePayload[]>,
    )
  })

  await new Promise<void>((resolve, reject) => {
    channel.subscribe(async (status, error) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(presence)
        resolve()
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(error ?? new Error(`Realtime subscription failed: ${status}`))
      }
    })
  })

  return channel
}

export async function unsubscribeFromSession(channel: RealtimeChannel) {
  await channel.untrack()
  await supabase.removeChannel(channel)
}
