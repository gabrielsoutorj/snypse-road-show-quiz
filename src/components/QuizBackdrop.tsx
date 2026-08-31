import type { ReactNode } from 'react'
import { StageProgress, type PresentationStage } from './StageProgress'

type Props = {
  children: ReactNode
  compact?: boolean
  stage?: PresentationStage
}

export function QuizBackdrop({ children, compact = false, stage }: Props) {
  return (
    <main className="quiz-backdrop relative min-h-screen overflow-hidden bg-black text-white">
      <div className="neon-orb neon-orb-pink" />
      <div className="neon-orb neon-orb-blue" />
      <div className="digital-grid" />
      <div className="particle-field" />
      <DigitalWaves />

      <div
        className={`relative z-10 mx-auto flex min-h-screen w-full flex-col ${
          compact ? 'max-w-lg px-5 py-6 sm:py-9' : 'max-w-[1600px] px-6 py-6 lg:px-12 lg:py-8'
        }`}
      >
        <BrandHeader compact={compact} />
        {children}
        {stage && <StageProgress active={stage} />}
      </div>
    </main>
  )
}

function BrandHeader({ compact }: { compact: boolean }) {
  return (
    <header className={`brand-header ${compact ? 'brand-header-compact' : ''}`}>
      <div className="brand-signature" aria-label="Snypse">
        <span className="brand-snypse">Snypse</span>
      </div>
      <p className="brand-event">Road Show · H2 2026</p>
    </header>
  )
}

function DigitalWaves() {
  const paths = Array.from({ length: 10 }, (_, index) => index)
  return (
    <svg className="digital-waves" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
      <g className="digital-wave-pink">
        {paths.map((index) => (
          <path key={`pink-${index}`} d={`M -160 ${610 + index * 12} C 80 ${500 + index * 9}, 250 ${760 - index * 7}, 540 ${620 + index * 10}`} />
        ))}
      </g>
      <g className="digital-wave-blue">
        {paths.map((index) => (
          <path key={`blue-${index}`} d={`M 1180 ${90 + index * 12} C 1390 ${20 + index * 8}, 1370 ${430 + index * 8}, 1740 ${260 + index * 11}`} />
        ))}
      </g>
      <g className="digital-nodes">
        <circle cx="75" cy="650" r="3" /><circle cx="180" cy="590" r="2" /><circle cx="315" cy="680" r="3" />
        <circle cx="1280" cy="295" r="3" /><circle cx="1390" cy="210" r="2" /><circle cx="1510" cy="360" r="3" />
      </g>
    </svg>
  )
}
