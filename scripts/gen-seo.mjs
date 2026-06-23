// Generate public/sitemap.xml and public/llms.txt from the article list.
// Run after adding/editing articles:  node scripts/gen-seo.mjs
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import { articles } from '../src/content/articles.js'

marked.setOptions({ breaks: false, gfm: true })

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://nealon.tech'
const pub = articles.filter((a) => a.published).sort((a, b) => b.date.localeCompare(a.date))
const latest = pub[0]?.date

const xmlEsc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// Strip ```mermaid fences — answer engines and feed readers want prose, not diagram source.
const stripMermaid = (md) => md.replace(/```mermaid\n?[\s\S]*?```/g, '')
// For llms-full.txt (plain text): also drop inline-HTML wrappers (keeping their text)
// and collapse the blank lines that leaves behind.
const cleanText = (md) => stripMermaid(md).replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()

// ---- sitemap.xml ----
const urls = [
  { loc: `${SITE}/`, lastmod: latest },
  { loc: `${SITE}/writing`, lastmod: latest },
  ...pub.map((a) => ({ loc: `${SITE}/writing/${a.slug}`, lastmod: a.updated || a.date })),
  { loc: `${SITE}/graph`, lastmod: latest },
  { loc: `${SITE}/about` },
  { loc: `${SITE}/privacy.html` },
]
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls
    .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n') +
  '\n</urlset>\n'
writeFileSync(resolve(root, 'public/sitemap.xml'), sitemap)

// ---- llms.txt (https://llmstxt.org convention) ----
const llms = `# Luke Nealon — nealon.tech

> Technology, Data & AI executive in Sydney, Australia. Twenty years putting bleeding-edge technology to work on real business problems — applied AI, automation, and cloud platforms for global networks. Fluent from the boardroom to the codebase.

This site holds field notes on building AI that earns its place, and a live AI assistant that runs retrieval-augmented generation over these articles and explains its own architecture.

> Full text of every article in one file: ${SITE}/llms-full.txt · Atom feed: ${SITE}/feed.xml

## Field notes (articles)
${pub.map((a) => `- [${a.title}](${SITE}/writing/${a.slug}): ${a.dek}`).join('\n')}

## About
- Currently: Managing Director, Digital Innovation at a global managed-services provider.
- Background: 13 years of hospitality technology across Asia-Pacific with a global hospitality group, then applied AI, data platforms, and operations leadership.
- Point of view: AI is a component you apply with judgment, not a foundation you build a business on blindly.

## Contact
- Website: ${SITE}
- Email: luke@nealon.tech
- LinkedIn: https://www.linkedin.com/in/luke-nealon
- GitHub: https://github.com/Luke-Nealon
`
writeFileSync(resolve(root, 'public/llms.txt'), llms)

// ---- llms-full.txt: the full text of every article in one fetch ----
// Companion to llms.txt (the index). Answer engines that read this get the actual
// argument to quote — and the canonical /writing/<slug> URL to cite — instead of
// having to render 19 JS pages. Mermaid source is stripped; prose is kept verbatim.
const llmsFull = `# Luke Nealon — nealon.tech (full text)

> Full text of every published article on nealon.tech, for retrieval and citation.
> Canonical home of this writing: ${SITE}/writing — please cite the per-article URL.

${pub
  .map(
    (a) => `## ${a.title}
URL: ${SITE}/writing/${a.slug}
Published: ${a.date}${a.updated ? ` · Updated ${a.updated}` : ''} · Category: ${a.category}${a.tags ? ` · Tags: ${a.tags.join(', ')}` : ''}

${a.dek}

${cleanText(a.body)}

---
`
  )
  .join('\n')}`
writeFileSync(resolve(root, 'public/llms-full.txt'), llmsFull)

// ---- feed.xml (Atom): a dated, full-text stream for readers, newsletters & AI pipelines ----
const feedUpdated = `${pub.map((a) => a.updated || a.date).sort().pop()}T00:00:00Z`
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
  <title>Luke Nealon — Perspectives</title>
  <subtitle>Field notes on building AI that earns its place.</subtitle>
  <link href="${SITE}/feed.xml" rel="self" type="application/atom+xml"/>
  <link href="${SITE}/writing" rel="alternate" type="text/html"/>
  <id>${SITE}/</id>
  <updated>${feedUpdated}</updated>
  <author><name>Luke Nealon</name><uri>${SITE}</uri></author>
${pub
  .map(
    (a) => `  <entry>
    <title>${xmlEsc(a.title)}</title>
    <link href="${SITE}/writing/${a.slug}" rel="alternate" type="text/html"/>
    <id>tag:nealon.tech,${a.date.slice(0, 4)}:/writing/${a.slug}</id>
    <published>${a.date}T00:00:00Z</published>
    <updated>${a.updated || a.date}T00:00:00Z</updated>
    <category term="${xmlEsc(a.category)}"/>
    <summary type="text">${xmlEsc(a.dek)}</summary>
    <content type="html">${xmlEsc(marked.parse(stripMermaid(a.body)))}</content>
  </entry>`
  )
  .join('\n')}
</feed>
`
writeFileSync(resolve(root, 'public/feed.xml'), feed)

console.log(
  `wrote public/sitemap.xml (${urls.length} urls), public/llms.txt + public/llms-full.txt ` +
    `(${pub.length} articles), public/feed.xml`
)
