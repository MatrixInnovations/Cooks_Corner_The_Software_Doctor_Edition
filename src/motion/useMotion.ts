import { useState } from 'react'
import { readAllowsMotion } from './policy'

/** Stable for the lifetime of the page. False when the visitor asked for less motion. */
export function useMotionFlag(): boolean {
  const [on] = useState(() => readAllowsMotion(typeof window === 'undefined' ? undefined : window))
  return on
}
