// Prerender per-route static HTML for crawlers that don't run JavaScript.
// Two jobs per page:
//   1) Route-specific <title> + OG/Twitter meta + canonical + JSON-LD (so social
//      crawlers and AI answer engines see correct metadata and a structured entity).
//   2) The actual page BODY rendered into <div id="root"> — article prose, the
//      writing index, /about, /graph — so a non-JS fetcher (PerplexityBot,
//      OAI-SearchBot, Claude-SearchBot, …) receives real, quotable content, not an
//      empty shell. React uses createRoot(), so on hydration it replaces #root and
//      the prerendered body is invisible to humans (no visual change).
// A CloudFront Function routes /writing/<slug> -> /writing/<slug>.html, /about ->
// /about.html, /graph -> /graph.html; the SPA still hydrates normally.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import { publishedArticles, CATEGORIES } from '../src/content/articles.js'
import { about } from '../src/content.js'

marked.setOptions({ breaks: false, gfm: true })

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const SITE = 'https://nealon.tech'
const LUKE = 'https://nealon.tech/#luke' // the Person entity defined in index.html's JSON-LD

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const stripMermaid = (md) => md.replace(/```mermaid\n?[\s\S]*?```/g, '')
const renderBody = (md) => marked.parse(stripMermaid(md))
const yr = (iso) => iso.slice(0, 4)
const displayDate = (a) => (a.updated ? `Updated ${yr(a.updated)}` : yr(a.date))
const ldScript = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`

// Replace the content="" value of the first <meta> tag matching `match`.
function setMeta(html, match, value) {
  return html.replace(/<meta\b[\s\S]*?\/?>/gi, (tag) => {
    if (!tag.includes(match)) return tag
    return tag.replace(/content="[\s\S]*?"/i, `content="${esc(value)}"`)
  })
}
function setTitle(html, value) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(value)}</title>`)
}
function injectAfterTitle(html, extra) {
  return html.replace(/(<\/title>)/i, `$1\n    ${extra}`)
}

function pageHtml(
  template,
  { title, description, url, image, type = 'website', publishedTime, modifiedTime, section, canonical, jsonld, bodyHtml, profile }
) {
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
  if (type === 'article') {
    if (publishedTime) extras.push(`<meta property="article:published_time" content="${esc(publishedTime)}" />`)
    if (modifiedTime) extras.push(`<meta property="article:modified_time" content="${esc(modifiedTime)}" />`)
    if (section) extras.push(`<meta property="article:section" content="${esc(section)}" />`)
    extras.push('<meta property="article:author" content="https://www.linkedin.com/in/luke-nealon" />')
  }
  if (type === 'profile' && profile) {
    extras.push(`<meta property="profile:first_name" content="${esc(profile.first)}" />`)
    extras.push(`<meta property="profile:last_name" content="${esc(profile.last)}" />`)
  }
  if (jsonld) extras.push(jsonld)
  h = injectAfterTitle(h, extras.join('\n    '))
  if (bodyHtml) {
    const replaced = h.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`)
    if (replaced === h) console.warn('  ! could not inject body — <div id="root"></div> not found')
    h = replaced
  }
  return h
}

const template = readFileSync(resolve(dist, 'index.html'), 'utf8')
const arts = publishedArticles()
mkdirSync(resolve(dist, 'writing'), { recursive: true })

// ---- semantic "related" from the precomputed knowledge graph (no Bedrock at build) ----
let graph = { edges: [] }
try {
  graph = JSON.parse(readFileSync(resolve(root, 'public/graph.json'), 'utf8'))
} catch {
  console.warn('  ! public/graph.json not found — related links fall back to same-category')
}
const bySlug = new Map(arts.map((a) => [a.slug, a]))
function relatedFor(slug, n = 3) {
  const scored = new Map()
  for (const e of graph.edges || []) {
    let other = null
    if (e.source === slug) other = e.target
    else if (e.target === slug) other = e.source
    else continue
    if (!bySlug.has(other)) continue
    const w = e.type === 'link' ? 1 : e.weight || 0.5
    scored.set(other, Math.max(scored.get(other) || 0, w))
  }
  let list = [...scored.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => bySlug.get(s))
  if (list.length < 2) {
    const self = bySlug.get(slug)
    const more = arts.filter((a) => a.slug !== slug && a.category === self.category && !scored.has(a.slug))
    list = [...list, ...more]
  }
  return list.slice(0, n)
}

function relatedNav(related) {
  if (!related.length) return ''
  return (
    `<nav class="article-related"><h3 class="article-related-h">Related reading</h3>` +
    related
      .map(
        (r) =>
          `<a class="article-related-card" href="/writing/${r.slug}">` +
          `<span class="article-related-title">${esc(r.title)}</span>` +
          `<span class="article-related-dek">${esc(r.dek)}</span></a>`
      )
      .join('') +
    `</nav>`
  )
}

function articleBodyHtml(a) {
  const meta = `${esc(a.category)} · ${esc(displayDate(a))} · ${a.readMins} min read`
  return (
    `<article class="article">` +
    `<a class="writing-back" href="/writing">← All perspectives</a>` +
    `<span class="article-meta">${meta}</span>` +
    `<h1 class="article-title">${esc(a.title)}</h1>` +
    `<p class="article-dek">${esc(a.dek)}</p>` +
    `<div class="article-body">${renderBody(a.body)}</div>` +
    relatedNav(relatedFor(a.slug)) +
    `<div class="article-foot"><span>Luke Nealon</span> <a href="/writing">More perspectives →</a></div>` +
    `</article>`
  )
}

function articleLd(a, url, image) {
  const article = {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: a.title,
    description: a.dek,
    datePublished: a.date,
    dateModified: a.updated || a.date,
    image,
    articleSection: a.category,
    keywords: a.tags ? a.tags.join(', ') : a.category,
    inLanguage: 'en',
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@id': LUKE, name: 'Luke Nealon' },
    publisher: { '@id': LUKE, name: 'Luke Nealon' },
  }
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Perspectives', item: `${SITE}/writing` },
      { '@type': 'ListItem', position: 3, name: a.title, item: url },
    ],
  }
  return ldScript({ '@context': 'https://schema.org', '@graph': [article, breadcrumb] })
}

let n = 0
for (const a of arts) {
  const url = `${SITE}/writing/${a.slug}`
  const image = `${SITE}/og/${a.slug}.png`
  const html = pageHtml(template, {
    title: `${a.title} — Luke Nealon`,
    description: a.dek,
    url,
    image,
    type: 'article',
    publishedTime: a.date,
    modifiedTime: a.updated || a.date,
    section: a.category,
    canonical: url,
    jsonld: articleLd(a, url, image),
    bodyHtml: articleBodyHtml(a),
  })
  writeFileSync(resolve(dist, `writing/${a.slug}.html`), html)
  n++
}

// ---- /writing — the section index, with a crawlable list of every essay ----
const writingBody =
  `<section class="sec wrap"><span class="idx">Perspectives</span><h2>Long-form essays</h2>` +
  `<p class="lede">Working notes on technology, AI, and the business of running it — written to be read by an operator, not an audience.</p>` +
  `<div class="writing-list">` +
  arts
    .map(
      (a) =>
        `<a class="writing-card" href="/writing/${a.slug}">` +
        `<span class="writing-meta">${esc(displayDate(a))} · ${a.readMins} min read</span>` +
        `<h4>${esc(a.title)}</h4><p>${esc(a.dek)}</p></a>`
    )
    .join('') +
  `</div></section>`
const writingLd = ldScript({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${SITE}/writing#page`,
  name: 'Perspectives',
  url: `${SITE}/writing`,
  isPartOf: { '@id': 'https://nealon.tech/#website' },
  about: { '@id': LUKE },
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: arts.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/writing/${a.slug}`,
      name: a.title,
    })),
  },
})
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
    jsonld: writingLd,
    bodyHtml: writingBody,
  })
)

// ---- /about — a ProfilePage with the bio text crawlers can read ----
const aboutBody =
  `<article class="article"><h1 class="article-title">${esc(about.title)}</h1>` +
  `<p class="article-dek">${esc(about.big)}</p><dl class="about-facts">` +
  about.facts
    .map(
      (f) =>
        `<dt>${esc(f.k)}</dt><dd>${f.href ? `<a href="${esc(f.href)}">${esc(f.v)}</a>` : esc(f.v)}</dd>`
    )
    .join('') +
  `</dl></article>`
const aboutLd = ldScript({
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  url: `${SITE}/about`,
  mainEntity: {
    '@type': 'Person',
    '@id': LUKE,
    name: 'Luke Nealon',
    url: `${SITE}/about`,
    jobTitle: 'Technology, Data & AI Executive',
    knowsAbout: ['Applied AI', 'Cloud platforms', 'Automation', 'Technology strategy', 'Security and risk', 'Leadership'],
    sameAs: ['https://www.linkedin.com/in/luke-nealon', 'https://github.com/Luke-Nealon'],
  },
})
writeFileSync(
  resolve(dist, 'about.html'),
  pageHtml(template, {
    title: 'About — Luke Nealon',
    description:
      'Luke Nealon — technology, data & AI executive in Sydney. Who I am, and a career of being early on purpose: twenty years turning emerging tech into measurable business value.',
    url: `${SITE}/about`,
    image: `${SITE}/og/about.png`,
    type: 'profile',
    canonical: `${SITE}/about`,
    profile: { first: 'Luke', last: 'Nealon' },
    jsonld: aboutLd,
    bodyHtml: aboutBody,
  })
)

// ---- /graph — the knowledge map, as a crawlable hub of titled links by category ----
const presentCats = CATEGORIES.filter((c) => arts.some((a) => a.category === c))
const graphBody =
  `<section class="sec wrap"><h1 class="article-title">Knowledge map</h1>` +
  `<p class="article-dek">Every essay on nealon.tech, grouped by theme and wired to what it relates to.</p>` +
  presentCats
    .map(
      (c) =>
        `<section><h2>${esc(c)}</h2><ul>` +
        arts
          .filter((a) => a.category === c)
          .map((a) => `<li><a href="/writing/${a.slug}">${esc(a.title)}</a> — ${esc(a.dek)}</li>`)
          .join('') +
        `</ul></section>`
    )
    .join('') +
  `</section>`
const graphLd = ldScript({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': `${SITE}/graph#page`,
      name: 'Knowledge map',
      url: `${SITE}/graph`,
      isPartOf: { '@id': 'https://nealon.tech/#website' },
      about: { '@id': LUKE },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Knowledge map', item: `${SITE}/graph` },
      ],
    },
  ],
})
writeFileSync(
  resolve(dist, 'graph.html'),
  pageHtml(template, {
    title: 'Knowledge map — Luke Nealon',
    description:
      'A knowledge map of the writing on nealon.tech — every essay is a node, wired to the pieces its own embeddings judge most related.',
    url: `${SITE}/graph`,
    image: `${SITE}/og/perspectives.png`,
    type: 'website',
    canonical: `${SITE}/graph`,
    jsonld: graphLd,
    bodyHtml: graphBody,
  })
)

console.log(`prerendered ${n} article pages + writing index + about + graph (body + JSON-LD) → dist/`)
