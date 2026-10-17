import { useEffect, useRef, useState } from 'react'
import { JINGLE } from '../config/content'

/**
 * Marsaun's jingle. Rules: no autoplay (and nothing is downloaded until the first press), one play/pause toggle,
 * stops at the end and resets to the start, pauses if the tab is hidden. The playing state is a filled button plus
 * three small bars that only animate when reduced motion is not requested.
 */
export default function Jingle() {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const a = new Audio()
    a.preload = 'none'
    const type = JINGLE.sources.find((s) => a.canPlayType(s.type))
    a.src = (type ?? JINGLE.sources[0]).src
    a.addEventListener('play', () => setPlaying(true))
    a.addEventListener('pause', () => setPlaying(false))
    a.addEventListener('ended', () => { a.currentTime = 0; setPlaying(false) })
    audio.current = a
    const hide = () => { if (document.hidden) a.pause() }
    document.addEventListener('visibilitychange', hide)
    return () => { document.removeEventListener('visibilitychange', hide); a.pause(); a.removeAttribute('src'); a.load() }
  }, [])

  const toggle = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) void a.play().catch(() => setPlaying(false))
    else a.pause()
  }

  const label = playing ? `Pause the ${JINGLE.label}` : `Play the ${JINGLE.label}`
  return (
    <div className="jingle">
      <button type="button" className={'jingle-btn' + (playing ? ' playing' : '')} onClick={toggle} aria-label={label}>
        {playing ? (
          <span className="jbars" aria-hidden="true"><i /><i /><i /></span>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
        )}
        <span aria-hidden="true">{playing ? 'Pause jingle' : 'Play jingle'}</span>
      </button>
    </div>
  )
}
