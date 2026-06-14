// Generate per-article OG images (1200x630 PNG) on brand: dark Control-theme card,
// mint accent, Schibsted Grotesk title + IBM Plex Mono labels. satori renders the
// layout to SVG (text -> vector paths using the real fonts); resvg rasterises to PNG.
// Output -> public/og/<slug>.png (served at /og/<slug>.png). Re-run when articles change:
//   node scripts/gen-og-images.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { publishedArticles } from '../src/content/articles.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fontsDir = resolve(root, 'scripts/fonts')
const outDir = resolve(root, 'public/og')
mkdirSync(outDir, { recursive: true })

const fonts = [
  { name: 'Schibsted Grotesk', data: readFileSync(resolve(fontsDir, 'SchibstedGrotesk-600.woff')), weight: 600, style: 'normal' },
  { name: 'IBM Plex Mono', data: readFileSync(resolve(fontsDir, 'IBMPlexMono-Regular.ttf')), weight: 400, style: 'normal' },
  { name: 'IBM Plex Mono', data: readFileSync(resolve(fontsDir, 'IBMPlexMono-SemiBold.ttf')), weight: 600, style: 'normal' },
]

const C = {
  bg: '#0a0e13',
  title: '#eef3f7',
  ink: '#dce4ec',
  dim: '#a7b3bf',
  muted: '#76828e',
  accent: '#5ce1c6',
}

// tiny hyperscript for satori's react-element shape
const h = (type, style, children) => ({ type, props: { style, ...(children !== undefined ? { children } : {}) } })

const clamp = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

function card({ kicker, title, dek, footer, meta }) {
  return h(
    'div',
    {
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 72px 56px 80px',
      background: C.bg,
      backgroundImage:
        'radial-gradient(circle at 0% 0%, rgba(92,225,198,0.18), rgba(10,14,19,0) 42%), radial-gradient(circle at 100% 100%, rgba(92,225,198,0.08), rgba(10,14,19,0) 40%)',
      position: 'relative',
      fontFamily: 'IBM Plex Mono',
    },
    [
      // left accent bar
      h('div', { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, background: C.accent }),
      // top row
      h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 22 }, [
        h('div', { display: 'flex', alignItems: 'center' }, [
          h('div', { width: 14, height: 14, borderRadius: 14, background: C.accent, marginRight: 14 }),
          h('div', { color: C.ink, fontWeight: 600, letterSpacing: 2 }, kicker),
        ]),
        h('div', { color: C.muted, letterSpacing: 5, fontSize: 19 }, meta),
      ]),
      // middle: title + dek
      h('div', { display: 'flex', flexDirection: 'column' }, [
        h(
          'div',
          { fontFamily: 'Schibsted Grotesk', fontWeight: 600, color: C.title, fontSize: 64, lineHeight: 1.08, letterSpacing: -0.5 },
          title
        ),
        h('div', { color: C.dim, fontSize: 26, lineHeight: 1.42, marginTop: 28, maxWidth: 980 }, dek),
      ]),
      // bottom row
      h('div', { display: 'flex', flexDirection: 'column' }, [
        h('div', { height: 1, background: 'rgba(92,225,198,0.28)', marginBottom: 22 }),
        h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 21 }, [
          h('div', { display: 'flex' }, [
            h('div', { color: C.accent, fontWeight: 600 }, 'Luke Nealon'),
            h('div', { color: C.muted, marginLeft: 14 }, '— Technology, Data & AI'),
          ]),
          h('div', { color: C.muted, letterSpacing: 2 }, footer),
        ]),
      ]),
    ]
  )
}

async function render(el, file) {
  const svg = await satori(el, { width: 1200, height: 630, fonts })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
  writeFileSync(resolve(outDir, file), png)
}

let n = 0
for (const a of publishedArticles()) {
  await render(
    card({
      kicker: 'NEALON.TECH',
      meta: 'PERSPECTIVES',
      title: clamp(a.title, 86),
      dek: clamp(a.dek, 150),
      footer: `${a.readMins} MIN READ`,
    }),
    `${a.slug}.png`
  )
  n++
}

// section index image
await render(
  card({
    kicker: 'NEALON.TECH',
    meta: 'PERSPECTIVES',
    title: 'Field notes on building AI that earns its place',
    dek: 'Model independence, agents vs. workflows, cutting waste before automating — and a live demo that explains its own architecture.',
    footer: `${n} ESSAYS`,
  }),
  'perspectives.png'
)

console.log(`generated ${n} article OG images + perspectives.png → public/og/`)
