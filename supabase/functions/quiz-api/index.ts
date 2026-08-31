import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.4'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'

type Action =
  | 'create-session'
  | 'join-session'
  | 'submit-answer'
  | 'host-command'
  | 'snapshot'

type RequestBody = {
  action?: Action
  pin?: string
  nickname?: string
  sessionId?: string
  option?: 'A' | 'B' | 'C' | 'D'
  command?:
    | 'start_question'
    | 'close_answers'
    | 'show_result'
    | 'reveal_answer'
    | 'show_ranking'
    | 'show_podium'
    | 'end_session'
  expectedVersion?: number
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const publishableKey =
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error('Missing required Supabase Edge Function environment variables.')
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`INVALID_${field.toUpperCase()}`)
  }
  return value
}

async function createRequestClients(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization) throw new Error('AUTHORIZATION_REQUIRED')

  const userClient = createClient(supabaseUrl!, publishableKey!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user) throw new Error('INVALID_AUTHORIZATION')

  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return { admin, user: data.user }
}

async function createSnapshot(
  admin: SupabaseClient,
  userId: string,
  sessionId: string,
) {
  const { data: session, error: sessionError } = await admin
    .from('sessions')
    .select(
      'id, quiz_id, pin, host_user_id, status, phase, phase_version, current_question_id, question_opened_at, answer_deadline_at',
    )
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) throw new Error('SESSION_NOT_FOUND')

  const isHost = session.host_user_id === userId
  const { data: participant } = await admin
    .from('participants')
    .select(
      'id, nickname, total_points, correct_answers, total_response_ms, joined_at',
    )
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!isHost && !participant) throw new Error('SESSION_ACCESS_DENIED')

  const snapshot: Record<string, unknown> = {
    serverNow: new Date().toISOString(),
    role: isHost ? 'host' : 'participant',
    session: {
      id: session.id,
      pin: session.pin,
      status: session.status,
      phase: session.phase,
      phaseVersion: session.phase_version,
      currentQuestionId: session.current_question_id,
      questionOpenedAt: session.question_opened_at,
      answerDeadlineAt: session.answer_deadline_at,
    },
    participant,
  }

  const { count: questionCount, error: questionCountError } = await admin
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', session.quiz_id)
    .eq('is_active', true)

  if (questionCountError) throw questionCountError
  snapshot.questionCount = questionCount ?? 0

  if (isHost) {
    const { data: participants, error } = await admin
      .from('participants')
      .select(
        'id, user_id, nickname, total_points, correct_answers, total_response_ms, joined_at',
      )
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true })

    if (error) throw error
    snapshot.participants = participants ?? []
  }

  if (!session.current_question_id) return snapshot

  const { data: question, error: questionError } = await admin
    .from('questions')
    .select(
      'id, position, title, support_text, insight_title, insight_body, duration_seconds, show_ranking_after',
    )
    .eq('id', session.current_question_id)
    .single()

  if (questionError || !question) throw new Error('QUESTION_NOT_FOUND')

  const { data: options, error: optionsError } = await admin
    .from('question_options')
    .select('id, label, text, position')
    .eq('question_id', question.id)
    .order('position', { ascending: true })

  if (optionsError) throw optionsError

  snapshot.question = {
    id: question.id,
    position: question.position,
    title: question.title,
    supportText: question.support_text,
    durationSeconds: question.duration_seconds,
    showRankingAfter: question.show_ranking_after,
    options: options ?? [],
  }

  if (participant) {
    const { data: answer } = await admin
      .from('answers')
      .select('id, option_id, submitted_at, response_ms')
      .eq('session_id', sessionId)
      .eq('question_id', question.id)
      .eq('participant_id', participant.id)
      .maybeSingle()

    snapshot.ownAnswer = answer
  }

  if (!isHost) return snapshot

  const { data: answers, error: answersError } = await admin
    .from('answers')
    .select('option_id')
    .eq('session_id', sessionId)
    .eq('question_id', question.id)

  if (answersError) throw answersError

  const counts = Object.fromEntries((options ?? []).map((option) => [option.label, 0]))
  const labelsById = new Map((options ?? []).map((option) => [option.id, option.label]))
  for (const answer of answers ?? []) {
    const label = labelsById.get(answer.option_id)
    if (label) counts[label] += 1
  }

  snapshot.answerCount = answers?.length ?? 0
  snapshot.result = {
    totalAnswers: answers?.length ?? 0,
    counts,
  }

  const revealPhases = new Set(['answer_reveal', 'ranking', 'podium', 'ended'])
  if (revealPhases.has(session.phase)) {
    const { data: correctOption, error: correctError } = await admin
      .from('question_options')
      .select('label')
      .eq('question_id', question.id)
      .eq('is_correct', true)
      .single()

    if (correctError || !correctOption) throw new Error('CORRECT_OPTION_NOT_FOUND')
    snapshot.reveal = {
      correctOption: correctOption.label,
      insightTitle: question.insight_title,
      insightBody: question.insight_body,
    }
  }

  const { data: ranking, error: rankingError } = await admin
    .from('participants')
    .select('id, nickname, total_points, correct_answers, total_response_ms, joined_at')
    .eq('session_id', sessionId)
    .order('total_points', { ascending: false })
    .order('correct_answers', { ascending: false })
    .order('total_response_ms', { ascending: true })
    .order('joined_at', { ascending: true })
    .limit(session.phase === 'podium' ? 3 : 5)

  if (rankingError) throw rankingError
  snapshot.ranking = ranking ?? []

  return snapshot
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  try {
    const body = (await request.json()) as RequestBody
    const action = requiredString(body.action, 'action') as Action
    const { admin, user } = await createRequestClients(request)

    if (action === 'create-session') {
      const { data, error } = await admin.rpc('create_quiz_session', {
        p_host_user_id: user.id,
      })
      if (error) throw error
      return jsonResponse({ data })
    }

    if (action === 'join-session') {
      const pin = requiredString(body.pin, 'pin')
      const nickname = requiredString(body.nickname, 'nickname')
      const { data, error } = await admin.rpc('join_quiz_session', {
        p_pin: pin,
        p_user_id: user.id,
        p_nickname: nickname,
      })
      if (error) throw error
      return jsonResponse({ data })
    }

    const sessionId = requiredString(body.sessionId, 'session_id')

    if (action === 'submit-answer') {
      if (!body.option || !['A', 'B', 'C', 'D'].includes(body.option)) {
        throw new Error('INVALID_OPTION')
      }

      const { data, error } = await admin.rpc('submit_quiz_answer', {
        p_session_id: sessionId,
        p_user_id: user.id,
        p_option: body.option,
      })
      if (error) throw error
      return jsonResponse({ data: Array.isArray(data) ? data[0] : data })
    }

    if (action === 'host-command') {
      if (!body.command || !Number.isInteger(body.expectedVersion)) {
        throw new Error('INVALID_HOST_COMMAND')
      }

      const rpc =
        body.command === 'close_answers'
          ? admin.rpc('close_quiz_question', {
              p_session_id: sessionId,
              p_actor_user_id: user.id,
              p_expected_version: body.expectedVersion,
              p_force: true,
            })
          : admin.rpc('transition_quiz_session', {
              p_session_id: sessionId,
              p_actor_user_id: user.id,
              p_expected_version: body.expectedVersion,
              p_command: body.command,
            })

      const { data, error } = await rpc
      if (error) throw error
      return jsonResponse({ data })
    }

    if (action === 'snapshot') {
      const data = await createSnapshot(admin, user.id, sessionId)
      return jsonResponse({ data })
    }

    return jsonResponse({ error: 'UNKNOWN_ACTION' }, 400)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'UNEXPECTED_ERROR'
    const forbidden = message.includes('HOST_ONLY') || message.includes('ACCESS_DENIED')
    const unauthorized = message.includes('AUTHORIZATION')
    return jsonResponse(
      { error: message },
      unauthorized ? 401 : forbidden ? 403 : 400,
    )
  }
})
