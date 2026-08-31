import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  friendlyQuizError,
  isValidPin,
  normalizeNickname,
  validateNickname,
} from '../domain/build-two'
import { quizApi } from '../lib/quiz-api'
import { PinDisplay } from '../components/PinDisplay'
import { QuizBackdrop } from '../components/QuizBackdrop'

export function NicknamePage() {
  const navigate = useNavigate()
  const { pin = '' } = useParams()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isValidPin(pin)) {
    return (
      <QuizBackdrop compact>
        <section className="grid flex-1 place-items-center text-center">
          <div className="mobile-neon-card w-full">
            <h1 className="text-3xl font-black uppercase">Código inválido</h1>
            <p className="mt-3 text-zinc-400">O PIN precisa ter seis números.</p>
            <Link to="/" className="primary-action mt-8 inline-flex w-full justify-center">
              Digitar novamente
            </Link>
          </div>
        </section>
      </QuizBackdrop>
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const validation = validateNickname(nickname)
    if (validation) {
      setError(validation)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const participant = await quizApi.joinSession(pin, nickname.trim())
      sessionStorage.setItem('snypse:last-session', participant.session_id)
      navigate(`/play/${participant.session_id}`, { replace: true })
    } catch (reason) {
      setError(friendlyQuizError(reason))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <QuizBackdrop compact>
      <section className="flex flex-1 flex-col justify-center py-8">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-pink-400">Sala encontrada</p>
          <div className="mt-4">
            <PinDisplay pin={pin} compact />
          </div>
          <h1 className="mt-8 text-4xl font-black uppercase">Como quer aparecer?</h1>
          <p className="mt-3 text-zinc-400">Escolha um nickname curto e fácil de reconhecer.</p>
        </div>

        <form onSubmit={submit} className="mobile-neon-card mt-9">
          <label htmlFor="nickname" className="form-label">
            Seu nickname
          </label>
          <input
            id="nickname"
            value={nickname}
            onChange={(event) => {
              setNickname(normalizeNickname(event.target.value))
              setError(null)
            }}
            maxLength={24}
            autoComplete="nickname"
            placeholder="Ex.: MariaFlor"
            className="nickname-input"
            autoFocus
          />
          <div className="mt-2 flex items-start justify-between gap-3 text-xs">
            <span className={error ? 'text-pink-400' : 'text-zinc-500'}>{error ?? '2 a 24 caracteres'}</span>
            <span className="text-zinc-600">{nickname.trim().length}/24</span>
          </div>
          <button
            type="submit"
            className="primary-action mt-6 w-full"
            disabled={submitting || Boolean(validateNickname(nickname))}
          >
            {submitting ? 'Entrando…' : 'Entrar na sala'}
          </button>
        </form>

        <Link to="/" className="mx-auto mt-7 text-sm font-semibold text-zinc-500 hover:text-white">
          Usar outro código
        </Link>
      </section>
    </QuizBackdrop>
  )
}
