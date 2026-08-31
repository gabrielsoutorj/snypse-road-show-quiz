import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const publishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY
const participantCount = Math.min(
  100,
  Math.max(2, Number.parseInt(process.env.SMOKE_PARTICIPANTS ?? '20', 10) || 20),
)

if (!supabaseUrl || !publishableKey) {
  throw new Error(
    'Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY antes do teste.',
  )
}

function client() {
  return createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function authenticate(instance) {
  const { data, error } = await instance.auth.signInAnonymously()
  if (error || !data.user || !data.session) throw error ?? new Error('Falha na autenticação anônima.')
  return data
}

async function quizApi(instance, body) {
  const { data, error } = await instance.functions.invoke('quiz-api', { body })
  if (error) {
    let detail = error.message
    if (error.context && typeof error.context.text === 'function') {
      detail = await error.context.text().catch(() => error.message)
    }
    throw new Error(`${body.action}: ${detail}`)
  }
  if (!data || data.error) throw new Error(data?.error ?? 'Resposta vazia da quiz-api.')
  return data.data
}

async function main() {
  console.log(`Iniciando ensaio com ${participantCount} participantes…`)

  const host = client()
  const hostAuth = await authenticate(host)
  const session = await quizApi(host, { action: 'create-session' })
  console.log(`Sala criada: PIN ${session.pin}`)

  let broadcastCount = 0
  await host.realtime.setAuth(hostAuth.session.access_token)
  const channel = host.channel(`session:${session.id}`, { config: { private: true } })
  for (const event of ['participant_joined', 'answer_count_changed', 'phase_changed']) {
    channel.on('broadcast', { event }, () => {
      broadcastCount += 1
    })
  }
  await new Promise((resolve, reject) => {
    const statuses = []
    const timeout = setTimeout(
      () => reject(new Error(`Realtime não conectou em 20 segundos. Estados: ${statuses.join(', ') || 'nenhum'}`)),
      20_000,
    )
    channel.subscribe((status, error) => {
      statuses.push(error ? `${status} (${error.message})` : status)
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout)
        resolve()
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout)
        reject(new Error(`Falha no canal Realtime: ${status}`))
      }
    })
  })

  const participants = await Promise.all(
    Array.from({ length: participantCount }, async (_, index) => {
      const instance = client()
      await authenticate(instance)
      const nickname = `Teste${String(index + 1).padStart(2, '0')}`
      const joined = await quizApi(instance, {
        action: 'join-session',
        pin: session.pin,
        nickname,
      })
      return { instance, joined, nickname }
    }),
  )
  console.log(`${participants.length} participantes conectados.`)

  let snapshot = await quizApi(host, { action: 'snapshot', sessionId: session.id })
  if (snapshot.participants.length !== participantCount) {
    throw new Error(`Esperados ${participantCount} participantes; recebidos ${snapshot.participants.length}.`)
  }

  const labels = ['A', 'B', 'C', 'D']
  for (let questionIndex = 0; questionIndex < snapshot.questionCount; questionIndex += 1) {
    await quizApi(host, {
      action: 'host-command',
      sessionId: session.id,
      command: 'start_question',
      expectedVersion: snapshot.session.phaseVersion,
    })
    snapshot = await quizApi(host, { action: 'snapshot', sessionId: session.id })

    await Promise.all(
      participants.map(({ instance }, participantIndex) =>
        quizApi(instance, {
          action: 'submit-answer',
          sessionId: session.id,
          option: labels[(participantIndex + questionIndex) % labels.length],
        }),
      ),
    )

    snapshot = await quizApi(host, { action: 'snapshot', sessionId: session.id })
    if (snapshot.answerCount !== participantCount) {
      throw new Error(
        `Pergunta ${questionIndex + 1}: esperadas ${participantCount} respostas; recebidas ${snapshot.answerCount}.`,
      )
    }

    for (const command of ['close_answers', 'show_result', 'reveal_answer']) {
      await quizApi(host, {
        action: 'host-command',
        sessionId: session.id,
        command,
        expectedVersion: snapshot.session.phaseVersion,
      })
      snapshot = await quizApi(host, { action: 'snapshot', sessionId: session.id })
    }

    if (snapshot.result.totalAnswers !== participantCount || !snapshot.reveal.correctOption) {
      throw new Error(`Pergunta ${questionIndex + 1}: resultado ou reveal incompleto.`)
    }

    const isLast = questionIndex + 1 === snapshot.questionCount
    if (isLast) {
      await quizApi(host, {
        action: 'host-command',
        sessionId: session.id,
        command: 'show_podium',
        expectedVersion: snapshot.session.phaseVersion,
      })
      snapshot = await quizApi(host, { action: 'snapshot', sessionId: session.id })
    } else if (snapshot.question.showRankingAfter) {
      await quizApi(host, {
        action: 'host-command',
        sessionId: session.id,
        command: 'show_ranking',
        expectedVersion: snapshot.session.phaseVersion,
      })
      snapshot = await quizApi(host, { action: 'snapshot', sessionId: session.id })
      if (!snapshot.ranking?.length) throw new Error('Ranking parcial vazio.')
    }

    console.log(`Pergunta ${questionIndex + 1}/${snapshot.questionCount} validada.`)
  }

  if (snapshot.session.phase !== 'podium' || snapshot.ranking.length < Math.min(3, participantCount)) {
    throw new Error('Pódio final incompleto.')
  }

  await quizApi(host, {
    action: 'host-command',
    sessionId: session.id,
    command: 'end_session',
    expectedVersion: snapshot.session.phaseVersion,
  })
  snapshot = await quizApi(host, { action: 'snapshot', sessionId: session.id })
  if (snapshot.session.status !== 'ended') throw new Error('A sessão não foi encerrada.')

  await new Promise((resolve) => setTimeout(resolve, 500))
  await host.removeChannel(channel)
  if (broadcastCount === 0) throw new Error('Nenhum evento Realtime foi recebido.')

  console.log(`Ensaio aprovado: 8 perguntas, ${participantCount * 8} respostas e ${broadcastCount} eventos Realtime.`)
}

main().catch((error) => {
  console.error('Ensaio reprovado:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
