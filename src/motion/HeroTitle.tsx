import type { CSSProperties } from 'react'
import { useMotionFlag } from './useMotion'

/**
 * The approved hero headline. Reduced motion (and the no-motion path) keeps the original markup.
 * With motion, each letter is a span so CSS can stagger it. The characters are unchanged.
 */
export default function HeroTitle() {
  const motion = useMotionFlag()
  if (!motion) {
    return (
      <h1 className="disp">
        We cook<br className="d" /> when<br />
        <em>you can't.</em>
      </h1>
    )
  }
  let letter = 0
  const chars = (text: string) =>
    [...text].map((c, i) => {
      if (c === ' ') return <span key={`${text}-${i}-s`}> </span>
      const d = letter++
      return (
        <span className="hero-ch" key={`${text}-${i}`} style={{ '--d': `${d * 32}ms` } as CSSProperties}>
          <span>{c}</span>
        </span>
      )
    })
  return (
    <h1 className="disp">
      {chars('We cook')}
      <br className="d" />
      {chars(' when')}
      <br />
      <em>{chars("you can't.")}</em>
    </h1>
  )
}
