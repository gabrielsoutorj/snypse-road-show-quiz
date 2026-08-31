const palette = [
  ['#ec0070', '#6d123d'],
  ['#8b5cf6', '#3c236e'],
  ['#0095ff', '#073c67'],
  ['#f59e0b', '#6c4306'],
  ['#14b8a6', '#075148'],
] as const

function hashNickname(value: string) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0)
}

export function ParticipantAvatar({
  nickname,
  size = 'medium',
  online,
}: {
  nickname: string
  size?: 'small' | 'medium' | 'large'
  online?: boolean
}) {
  const colors = palette[hashNickname(nickname) % palette.length]
  const initial = nickname.trim().charAt(0).toUpperCase() || '?'
  const sizeClass = {
    small: 'size-9 text-sm',
    medium: 'size-12 text-lg',
    large: 'size-20 text-3xl',
  }[size]

  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={`grid ${sizeClass} place-items-center rounded-full border font-black text-white shadow-lg`}
        style={{
          borderColor: colors[0],
          background: `linear-gradient(145deg, ${colors[0]}, ${colors[1]})`,
          boxShadow: `0 0 18px ${colors[0]}55`,
        }}
      >
        {initial}
      </span>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-black ${
            online ? 'bg-emerald-400' : 'bg-zinc-600'
          }`}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </span>
  )
}
