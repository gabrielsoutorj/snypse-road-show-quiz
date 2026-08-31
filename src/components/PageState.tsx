import { Link } from 'react-router-dom'
import { QuizBackdrop } from './QuizBackdrop'

export function LoadingPage({ message = 'Conectando à sala…' }: { message?: string }) {
  return (
    <QuizBackdrop compact>
      <section className="grid flex-1 place-items-center text-center">
        <div>
          <span className="loading-ring mx-auto" />
          <h1 className="mt-8 text-3xl font-black uppercase">{message}</h1>
          <p className="mt-3 text-zinc-400">Só mais um instante.</p>
        </div>
      </section>
    </QuizBackdrop>
  )
}

export function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <QuizBackdrop compact>
      <section className="grid flex-1 place-items-center py-10">
        <div className="mobile-neon-card w-full text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full border border-pink-500/70 bg-pink-500/10 text-3xl text-pink-400">
            !
          </div>
          <h1 className="mt-6 text-3xl font-black uppercase">{title}</h1>
          <p className="mt-3 leading-relaxed text-zinc-300">{message}</p>
          <Link to="/" className="primary-action mt-8 inline-flex w-full justify-center">
            Voltar para o início
          </Link>
        </div>
      </section>
    </QuizBackdrop>
  )
}
