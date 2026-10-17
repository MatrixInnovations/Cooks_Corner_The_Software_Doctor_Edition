import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** preload the fonts used above the fold so the headline doesn't swap late (keeps CLS ~0) */
function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        const want = [/anton-latin-400-normal.*\.woff2$/, /barlow-latin-(400|600|700)-normal.*\.woff2$/]
        const tags = Object.keys(ctx.bundle)
          .filter((f) => want.some((r) => r.test(f)))
          .map((f) => `<link rel="preload" as="font" type="font/woff2" href="/${f}" crossorigin>`)
        return html.replace('</head>', `${tags.join('\n    ')}\n  </head>`)
      },
    },
  }
}

// three.js + @react-three/fiber are only reachable through the lazy `Steam` import, so they ship in their own chunk.
export default defineConfig({ plugins: [react(), preloadFonts()], build: { chunkSizeWarningLimit: 1200 } })
