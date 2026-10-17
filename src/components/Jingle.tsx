import { useEffect, useRef, useState } from 'react'
import { JINGLE } from '../config/content'
import { Need } from './ui'

/**
 * Optional jingle. No autoplay, audio is not even requested until the first press (preload="none").
 * Until JINGLE.src is set in src/config/content.ts the button is disabled and carries a NEED tag.
 */
export default function Jingle() {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const ready = !!JINGLE.src

  useEffect(() => () => audio.current?.pause(), [])

  const toggle = () => {
    if (!JINGLE.src) return
    if (!audio.current) {
      const a = new Audio()
      a.preload = 'none'
      a.src = JINGLE.src
      a.addEventListener('ended', () => setPlaying(false))
      a.addEventListener('pause', () => setPlaying(false))
      a.addEventListener('play', () => setPlaying(true))
      audio.current = a
    }
    const a = audio.current
    if (a.paused) void a.play().catch(() => setPlaying(false))
    else a.pause()
  }

  return (
    <div className="jingle">
      <button type="button" className="jingle-btn" onClick={toggle} disabled={!ready} aria-pressed={ready ? playing : undefined}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          {playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" /> : <path d="M8 5v14l11-7z" fill="currentColor" />}
        </svg>
        <span>{playing ? 'Pause jingle' : 'Play jingle'}</span>
      </button>
      {!ready && <Need>Jingle audio file</Need>}
    </div>
  )
}
