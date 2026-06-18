// Prerender per-route static HTML with route-specific <title> + OG/Twitter meta.
// Social crawlers (LinkedIn, Twitter, Slack, iMessage) don't run JS, so client-set
// meta is invisible to them. We clone dist/index.html (same SPA bundle) and rewrite
// the head meta per article, writing dist/writing/<slug>.html. A CloudFront Function
// routes /writing/<slug> -> /writing/<slug>.html; the SPA still hydrates normally.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { publishedArticles } from '../src/content/articles.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const SITE = 'https://nealon.tech'
const OG_IMAGE = `${SITE}/og.png`

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Replace the content="" value of the first <meta> tag matching `match` (a substring
// that must appear in the tag, e.g. 'og:title' or 'name="description"').
function setMeta(html, match, value) {
  return html.replace(/<meta\b[\s\S]*?\/?>/gi, (tag) => {
    if (!tag.includes(match)) return tag
    return tag.replace(/content="[\s\S]*?"/i, `content="${esc(value)}"`)
  })
}
function setTitle(html, value) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(value)}</title>`)
}
// Add <link rel="canonical"> + og:type=article extras right after the <title>.
function injectAfterTitle(html, extra) {
  return html.replace(/(<\/title>)/i, `$1\n    ${extra}`)
}

function pageHtml(template, { title, description, url, image, type = 'website', publishedTime, canonical }) {
  let h = template
  h = setTitle(h, title)
  // exact attribute match (incl. closing quote) so 'og:image' doesn't also hit 'og:image:width'
  h = setMeta(h, 'name="description"', description)
  h = setMeta(h, 'property="og:title"', title)
  h = setMeta(h, 'property="og:description"', description)
  h = setMeta(h, 'property="og:type"', type)
  h = setMeta(h, 'property="og:url"', url)
  h = setMeta(h, 'property="og:image"', image)
  h = setMeta(h, 'name="twitter:title"', title)
  h = setMeta(h, 'name="twitter:description"', description)
  h = setMeta(h, 'name="twitter:image"', image)
  const extras = [`<link rel="canonical" href="${esc(canonical || url)}" />`]
  if (publishedTime) extras.push(`<meta property="article:published_time" content="${esc(publishedTime)}" />`)
  h = injectAfterTitle(h, extras.join('\n    '))
  return h
}

const template = readFileSync(resolve(dist, 'index.html'), 'utf8')
const arts = publishedArticles()
mkdirSync(resolve(dist, 'writing'), { recursive: true })

let n = 0
for (const a of arts) {
  const url = `${SITE}/writing/${a.slug}`
  const html = pageHtml(template, {
    title: `${a.title} — Luke Nealon`,
    description: a.dek,
    url,
    image: `${SITE}/og/${a.slug}.png`,
    type: 'article',
    publishedTime: a.date,
    canonical: url,
  })
  writeFileSync(resolve(dist, `writing/${a.slug}.html`), html)
  n++
}

// the index of the section itself
writeFileSync(
  resolve(dist, 'writing.html'),
  pageHtml(template, {
    title: 'Perspectives — Luke Nealon',
    description:
      'Working notes on building AI that earns its place — model independence, agents vs. workflows, cutting waste before automating, and a live demo that explains its own architecture.',
    url: `${SITE}/writing`,
    image: `${SITE}/og/perspectives.png`,
    type: 'website',
    canonical: `${SITE}/writing`,
  })
)

// the /about page (SPA route; served via the CloudFront /about -> /about.html rewrite)
writeFileSync(
  resolve(dist, 'about.html'),
  pageHtml(template, {
    title: 'About — Luke Nealon',
    description:
      'Luke Nealon — technology, data & AI executive in Sydney. Who I am, and a career of being early on purpose: twenty years turning emerging tech into measurable business value.',
    url: `${SITE}/about`,
    image: `${SITE}/og/about.png`,
    type: 'website',
    canonical: `${SITE}/about`,
  })
)

console.log(`prerendered ${n} article pages + writing index + about → dist/`)
