import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { friendlyQuizError } from '../domain/build-two'
import { isSupabaseConfigured } from '../lib/supabase'
import { quizApi } from '../lib/quiz-api'
import { QuizBackdrop } from '../components/QuizBackdrop'

export function HostStartPage() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createSession() {
    setCreating(true)
    setError(null)
    try {
      const session = await quizApi.createSession()
      navigate(`/host/${session.id}`)
    } catch (reason) {
      setError(friendlyQuizError(reason))
    } finally {
      setCreating(false)
    }
  }

  return (
    <QuizBackdrop>
      <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_0.8fr] lg:py-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">Controle do apresentador</p>
          <h1 className="mt-5 max-w-4xl text-6xl font-black uppercase leading-[0.88] sm:text-7xl lg:text-8xl">
            Pronto para o <span className="neon-title">quiz?</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-zinc-300 sm:text-xl">
            Crie uma sessão exclusiva, abra o telão e compartilhe o QR Code com os participantes.
          </p>
        </div>

        <aside className="neon-panel">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-pink-400">Road Show H2 2026</p>
          <h2 className="mt-3 text-4xl font-black uppercase">Nova sessão</h2>

          <div className="mt-7 grid gap-3">
            {['Quiz fixo do evento', 'Entrada sem login', 'Lobby em tempo real'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <span className="grid size-7 place-items-center rounded-full border border-emerald-400/50 text-xs text-emerald-300">✓</span>
                <span className="font-semibold text-zinc-200">{item}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="primary-action mt-7 w-full"
            onClick={createSession}
            disabled={creating || !isSupabaseConfigured}
          >
            {creating ? 'Criando sessão…' : 'Criar sessão'}
          </button>

          {!isSupabaseConfigured && (
            <p className="mt-4 text-sm leading-relaxed text-amber-300">
              Conecte as credenciais do Supabase para habilitar a criação de sessões reais.
            </p>
          )}
          {error && <p className="form-error mt-4">{error}</p>}
        </aside>
      </section>
    </QuizBackdrop>
  )
}
