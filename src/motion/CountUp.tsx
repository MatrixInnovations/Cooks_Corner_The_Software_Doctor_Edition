import { useLayoutEffect, useRef, useState } from 'react'
import { countFrame } from './count'
import { useMotionFlag } from './useMotion'

/**
 * Counts a number that is already on the page. The accessible string is the final
 * copy from the first paint. The animated digits are aria-hidden. Nothing here
 * invents a figure: at rest, and when motion is off, `text` is what gets read and shown.
 */
export default function CountUp({ text }: { text: string }) {
  const motion = useMotionFlag()
  const root = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(text)
  const [run, setRun] = useState(false)

  useLayoutEffect(() => {
    if (!motion) return
    const el = root.current
    if (!el || !('IntersectionObserver' in window)) return
    let raf = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        setRun(true)
        const tick = (now: number) => {
          const t = Math.min(1, (now - t0) / 1000)
          setShown(t >= 1 ? text : countFrame(text, t))
          if (t < 1) raf = requestAnimationFrame(tick)
        }
        setShown(countFrame(text, 0))
        raf = requestAnimationFrame(tick)
      },
      { rootMargin: '80px 0px', threshold: 0.2 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [motion, text])

  if (!motion) return <>{text}</>
  return (
    <span className={run ? 'count run' : 'count'} ref={root}>
      <span className="count-hold">{text}</span>
      <span className="count-live" aria-hidden="true">{shown}</span>
    </span>
  )
}
