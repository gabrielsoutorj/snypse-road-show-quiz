import { useEffect, useRef } from 'react'
import encodedMusic from '../sonican-news-flash-trivia-loop-225275.base64.txt?raw'

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const musicBytes = Uint8Array.from(atob(encodedMusic.trim()), (character) => character.charCodeAt(0))
    const musicUrl = URL.createObjectURL(new Blob([musicBytes], { type: 'audio/mpeg' }))

    audio.src = musicUrl
    audio.volume = 0.35

    let started = false
    const startMusic = () => {
      void audio.play().then(() => {
        started = true
        removeStartListeners()
      }).catch(() => {
        // Browsers can block audio until the first user interaction.
      })
    }

    const removeStartListeners = () => {
      window.removeEventListener('pointerdown', startMusic)
      window.removeEventListener('keydown', startMusic)
    }

    startMusic()
    if (!started) {
      window.addEventListener('pointerdown', startMusic)
      window.addEventListener('keydown', startMusic)
    }

    return () => {
      removeStartListeners()
      audio.pause()
      URL.revokeObjectURL(musicUrl)
    }
  }, [])

  return <audio ref={audioRef} loop preload="auto" aria-hidden="true" />
}
