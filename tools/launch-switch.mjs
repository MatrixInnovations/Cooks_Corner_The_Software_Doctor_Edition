// Launch switch. Runs after `vite build` (see package.json "build").
//   SITE_LAUNCH unset / anything but "true"  -> NO CHANGES. The build stays an unlisted, noindex preview (default).
//   SITE_LAUNCH=true                          -> public launch build: noindex removed from the HTML meta tags, _headers and
//                                                robots.txt (now Allow + Sitemap), sitemap.xml written, og:url added.
// The canonical URL in index.html already points at https://cookscornerllc.com/. The server side reads the same flag
// (netlify/lib/config.ts) and pins SITE_URL to https://cookscornerllc.com when it is "true".
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const LAUNCH_ORIGIN = 'https://cookscornerllc.com'

/** Pure transforms (unit tested). */
export function launchHtml(html) {
  return html
    .replace(/[ \t]*<!-- PREVIEW ONLY[^>]*-->\r?\n?/g, '')
    .replace(/[ \t]*<meta name="robots"[^>]*>\r?\n?/g, '')
    .replace(/[ \t]*<meta name="googlebot"[^>]*>\r?\n?/g, '')
    .replace(/[ \t]*<!-- Placeholder canonical[^>]*-->\r?\n?/g, '')
    .replace('</head>', `  <meta property="og:url" content="${LAUNCH_ORIGIN}/" />\n  </head>`)
}
export const launchHeaders = (h) => h.replace(/^[ \t]*X-Robots-Tag:.*\r?\n/gm, '')
export const launchRobots = () => `User-agent: *\nAllow: /\n\nSitemap: ${LAUNCH_ORIGIN}/sitemap.xml\n`
export const launchSitemap = (now = new Date()) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${LAUNCH_ORIGIN}/</loc><lastmod>${now.toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`

export function run(dist = 'dist', env = process.env) {
  if (env.SITE_LAUNCH !== 'true') {
    console.log('launch-switch: SITE_LAUNCH is not "true" -> preview build (noindex kept).')
    return false
  }
  const p = (f) => join(dist, f)
  writeFileSync(p('index.html'), launchHtml(readFileSync(p('index.html'), 'utf8')))
  if (existsSync(p('_headers'))) writeFileSync(p('_headers'), launchHeaders(readFileSync(p('_headers'), 'utf8')))
  writeFileSync(p('robots.txt'), launchRobots())
  writeFileSync(p('sitemap.xml'), launchSitemap())
  console.log(`launch-switch: SITE_LAUNCH=true -> public build for ${LAUNCH_ORIGIN} (noindex removed, robots allow, sitemap written).`)
  return true
}

import { fileURLToPath } from 'node:url'
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run()
