// Generate public/graph.json — a knowledge graph over the published articles.
// Nodes = articles; edges = explicit cross-links the author wrote + semantic
// similarity from Titan embeddings (the SAME embeddings that power the assistant's
// RAG). Run on demand (NOT in the build, it calls Bedrock):
//   AWS_PROFILE=personal node scripts/gen-graph.mjs
// Then ./deploy.sh ships public/graph.json. Re-run after adding/editing articles.
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { articles, CATEGORIES } from '../src/content/articles.js'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bedrock = new BedrockRuntimeClient({ region: 'ap-southeast-2' })

const stripMd = (body) =>
  body
    .replace(/```[\s\S]*?```/g, ' ')        // code / mermaid fences
    .replace(/<[^>]+>/g, ' ')                // inline HTML visuals
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links -> text
    .replace(/[#*_>`|]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

async function embed(text) {
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({ inputText: text.slice(0, 6000), dimensions: 1024, normalize: true }),
  }))
  return JSON.parse(new TextDecoder().decode(res.body)).embedding
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0) // normalized -> cosine

const pub = articles.filter((a) => a.published).sort((a, b) => a.date.localeCompare(b.date))
const slugs = new Set(pub.map((a) => a.slug))
const categories = CATEGORIES.filter((c) => pub.some((a) => a.category === c))

const nodes = pub.map((a) => ({
  id: a.slug, label: a.title, category: a.category, url: `/writing/${a.slug}`, dek: a.dek,
}))

// --- explicit cross-link edges (directed) ---
const linkPairs = new Set()
const edges = []
for (const a of pub) {
  const targets = new Set()
  for (const m of a.body.matchAll(/\/writing\/([a-z0-9-]+)/g)) {
    if (m[1] !== a.slug && slugs.has(m[1])) targets.add(m[1])
  }
  for (const t of targets) {
    edges.push({ source: a.slug, target: t, type: 'link' })
    linkPairs.add([a.slug, t].sort().join('::'))
  }
}

// --- semantic edges (undirected): top-2 nearest neighbours per article ---
process.stdout.write('embedding')
const vec = {}
for (const a of pub) { vec[a.slug] = await embed(`${a.title}. ${a.dek}\n\n${stripMd(a.body)}`); process.stdout.write('.') }
process.stdout.write('\n')

const simPairs = new Set()
for (const a of pub) {
  const near = pub
    .filter((b) => b.slug !== a.slug)
    .map((b) => ({ slug: b.slug, w: dot(vec[a.slug], vec[b.slug]) }))
    .sort((x, y) => y.w - x.w)
    .slice(0, 3)
    .filter((s) => s.w >= 0.4)
  for (const s of near) {
    const key = [a.slug, s.slug].sort().join('::')
    if (linkPairs.has(key) || simPairs.has(key)) continue // don't duplicate an authored link or a mirror
    simPairs.add(key)
    edges.push({ source: a.slug, target: s.slug, type: 'similar', weight: Math.round(s.w * 100) / 100 })
  }
}

// rescue: no node should be an island — connect any zero-degree node to its nearest neighbour
const degree = {}
nodes.forEach((n) => (degree[n.id] = 0))
edges.forEach((e) => { degree[e.source]++; degree[e.target]++ })
for (const a of pub) {
  if (degree[a.slug] > 0) continue
  const best = pub
    .filter((b) => b.slug !== a.slug)
    .map((b) => ({ slug: b.slug, w: dot(vec[a.slug], vec[b.slug]) }))
    .sort((x, y) => y.w - x.w)[0]
  if (!best) continue
  edges.push({ source: a.slug, target: best.slug, type: 'similar', weight: Math.round(best.w * 100) / 100 })
  degree[a.slug]++; degree[best.slug]++
}

const graph = { generated: `${pub.length} articles`, categories, nodes, edges }
writeFileSync(resolve(root, 'public/graph.json'), JSON.stringify(graph))
console.log(
  `wrote public/graph.json — ${nodes.length} nodes, ` +
  `${edges.filter((e) => e.type === 'link').length} link edges, ` +
  `${edges.filter((e) => e.type === 'similar').length} similar edges`
)
