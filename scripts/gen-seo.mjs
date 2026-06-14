// Generate public/sitemap.xml and public/llms.txt from the article list.
// Run after adding/editing articles:  node scripts/gen-seo.mjs
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { articles } from '../src/content/articles.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://nealon.tech'
const pub = articles.filter((a) => a.published).sort((a, b) => b.date.localeCompare(a.date))
const latest = pub[0]?.date

// ---- sitemap.xml ----
const urls = [
  { loc: `${SITE}/`, lastmod: latest },
  { loc: `${SITE}/writing`, lastmod: latest },
  ...pub.map((a) => ({ loc: `${SITE}/writing/${a.slug}`, lastmod: a.date })),
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

## Field notes (articles)
${pub.map((a) => `- [${a.title}](${SITE}/writing/${a.slug}): ${a.dek}`).join('\n')}

## About
- Currently: Managing Director, Digital Innovation at a global managed-services provider.
- Background: 13 years of hospitality technology across Asia-Pacific with the Accor group, then applied AI, data platforms, and operations leadership.
- Point of view: AI is a component you apply with judgment, not a foundation you build a business on blindly.

## Contact
- Website: ${SITE}
- Email: luke@nealon.tech
- LinkedIn: https://www.linkedin.com/in/luke-nealon
- GitHub: https://github.com/Luke-Nealon
`
writeFileSync(resolve(root, 'public/llms.txt'), llms)

console.log(`wrote public/sitemap.xml (${urls.length} urls) and public/llms.txt (${pub.length} articles)`)
