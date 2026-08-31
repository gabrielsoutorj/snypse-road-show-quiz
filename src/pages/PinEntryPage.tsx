import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isValidPin, normalizePin } from '../domain/build-two'
import { isSupabaseConfigured } from '../lib/supabase'
import { QuizBackdrop } from '../components/QuizBackdrop'

export function PinEntryPage() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!isValidPin(pin)) {
      setError('Digite os 6 números exibidos no telão.')
      return
    }
    navigate(`/join/${pin}`)
  }

  return (
    <QuizBackdrop compact>
      <section className="flex flex-1 flex-col justify-center py-8 sm:py-12">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">
            Quiz multiplayer em tempo real
          </p>
          <h1 className="mt-4 text-5xl font-black uppercase leading-[0.9] sm:text-6xl">
            Quiz <span className="neon-title">Road Show</span>
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-zinc-400">
            Digite o código exibido no telão para entrar na sala.
          </p>
        </div>

        <form onSubmit={submit} className="mobile-neon-card mt-10">
          <label htmlFor="session-pin" className="form-label">
            Código da sala
          </label>
          <input
            id="session-pin"
            value={pin}
            onChange={(event) => {
              setPin(normalizePin(event.target.value))
              setError(null)
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000 000"
            className="pin-input"
            aria-describedby={error ? 'pin-error' : undefined}
            autoFocus
          />
          {error && (
            <p id="pin-error" role="alert" className="form-error">
              {error}
            </p>
          )}
          <button type="submit" className="primary-action mt-6 w-full" disabled={!isValidPin(pin)}>
            Continuar
          </button>
        </form>

        {!isSupabaseConfigured && (
          <div className="config-notice mt-5" role="status">
            <span className="config-dot" />
            Preview visual ativo. Conecte o projeto Supabase para entrar em uma sala real.
          </div>
        )}

        <Link
          to="/host"
          className="mx-auto mt-8 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500 transition hover:text-cyan-300"
        >
          Área do apresentador
        </Link>
      </section>
    </QuizBackdrop>
  )
}
