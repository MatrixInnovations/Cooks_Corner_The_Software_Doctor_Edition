import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'

describe('Meet the Chef portrait', () => {
  it('commits the files Chef.tsx requests while the slot is ready', () => {
    const photos = readFileSync('src/config/photos.ts', 'utf8')
    const chef = readFileSync('src/components/Chef.tsx', 'utf8')
    expect(photos).toMatch(/ready:\s*true/)
    expect(photos).toMatch(/file:\s*'marsaun-portrait'/)
    expect(chef).toContain('people/${PORTRAIT.file}')
    expect(chef).toContain('-m.webp')
    expect(chef).toContain('-d.jpg')
    for (const name of [
      'marsaun-portrait-d.jpg',
      'marsaun-portrait-d.webp',
      'marsaun-portrait-m.jpg',
      'marsaun-portrait-m.webp',
    ]) {
      const size = statSync(`public/people/${name}`).size
      expect(size).toBeGreaterThan(20_000)
    }
  })
})
