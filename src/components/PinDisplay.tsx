export function PinDisplay({ pin, compact = false }: { pin: string; compact?: boolean }) {
  const formatted = `${pin.slice(0, 3)} ${pin.slice(3)}`
  return (
    <span
      className={`font-black tabular-nums tracking-[0.08em] text-white ${
        compact ? 'text-4xl sm:text-5xl' : 'text-6xl sm:text-7xl lg:text-8xl'
      }`}
    >
      {formatted}
    </span>
  )
}
