import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Snypse Quiz render failed', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="grid min-h-screen place-items-center bg-black px-6 text-white">
        <section className="w-full max-w-2xl rounded-3xl border border-pink-500/70 bg-zinc-950 p-8 shadow-[0_0_70px_rgba(236,0,112,0.22)]">
          <p className="text-sm font-bold uppercase tracking-[0.26em] text-pink-400">
            Snypse Road Show Quiz
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase">Não foi possível abrir esta tela</h1>
          <p className="mt-4 text-lg text-zinc-300">
            A aplicação encontrou um erro de configuração, mas continua visível para diagnóstico.
          </p>
          <pre className="mt-6 overflow-auto rounded-2xl border border-cyan-500/30 bg-black p-4 text-sm text-cyan-200">
            {this.state.error.message}
          </pre>
        </section>
      </main>
    )
  }
}
