// nealon.tech content radar — daily "what's worth writing about" digest.
// Gathers recent items per topic (Google News RSS — free, no key — + GitHub trending),
// asks Bedrock to pick the article-worthy ones and write a paragraph + angle in Luke's voice,
// then stores the result to S3 (for the tools "Radar" tab) and emails it via SES.
// Phase 1: RSS + GitHub. Phase 2 will add a search API (Tavily/Brave) and /last30days via Hermes.

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import Parser from 'rss-parser'

const REGION = process.env.AWS_REGION || 'ap-southeast-2'
const bedrock = new BedrockRuntimeClient({ region: REGION })
const ses = new SESv2Client({ region: REGION })
const s3 = new S3Client({ region: REGION })

const MODEL = process.env.MODEL_ID || 'au.anthropic.claude-sonnet-4-6'
const BUCKET = process.env.RADAR_BUCKET
const PREFIX = (process.env.RADAR_PREFIX || 'radar').replace(/\/$/, '')
const FROM = process.env.FROM_EMAIL
const TO = process.env.TO_EMAIL

const parser = new Parser({ timeout: 9000, headers: { 'user-agent': 'nealon-radar/1.0 (+https://nealon.tech)' } })

// Google News RSS search is a free, keyless news search for any query — good breadth across
// every topic, including the RSS-thin SD-WAN / SASE ones. A couple of direct feeds add depth.
const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
const CATEGORIES = [
  { name: 'IT Security', feeds: [gnews('IT security OR cybersecurity (breach OR vulnerability OR ransomware OR zero-day)'), 'https://feeds.feedburner.com/TheHackersNews', 'https://www.bleepingcomputer.com/feed/'] },
  { name: 'SD-WAN', feeds: [gnews('SD-WAN OR "software defined WAN"')] },
  { name: 'SASE', feeds: [gnews('SASE OR "secure access service edge" OR "security service edge"')] },
  { name: 'AI breakthroughs & news', feeds: [gnews('AI breakthrough OR "artificial intelligence" (model OR research OR release OR agent)'), 'https://venturebeat.com/category/ai/feed/'] },
]

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

async function fetchFeed(url) {
  try {
    const f = await parser.parseURL(url)
    return (f.items || []).map((i) => ({ title: i.title, url: i.link, date: i.isoDate || i.pubDate || '', source: f.title || '' }))
  } catch { return [] }
}

async function gatherCategory(cat) {
  const lists = await Promise.all(cat.feeds.map(fetchFeed))
  const seen = new Set(); const items = []
  for (const it of lists.flat().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))) {
    const k = (it.title || '').toLowerCase().replace(/\s+/g, ' ').trim()
    if (!k || seen.has(k)) continue
    seen.add(k); items.push({ title: it.title, url: it.url, source: it.source })
    if (items.length >= 10) break // keep each category small so ALL categories fit the prompt
  }
  return { name: cat.name, items }
}

// GitHub search API: new repos with the most stars = a robust "trending new projects" signal
// (no scraping, no key; 60 req/hr unauth is plenty for a daily run).
async function gatherGithub() {
  try {
    const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)
    const res = await fetch(`https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=15`, {
      headers: { 'user-agent': 'nealon-radar/1.0', accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return { name: 'GitHub trending (new repos)', items: [] }
    const j = await res.json()
    const items = (j.items || []).map((r) => ({ title: r.full_name, url: r.html_url, source: `${r.stargazers_count}★ · ${r.language || 'n/a'} — ${r.description || ''}`.slice(0, 240) }))
    return { name: 'GitHub trending (new repos)', items }
  } catch { return { name: 'GitHub trending (new repos)', items: [] } }
}

async function publishedTitles() {
  try { const r = await fetch('https://nealon.tech/llms.txt'); return (await r.text()).slice(0, 6000) } catch { return '' }
}

async function synthesize(gathered, published) {
  const prompt = `You are a content-radar assistant for Luke Nealon, a technology executive who writes long-form at nealon.tech. Positioning: "fluent from boardroom to codebase" — plain, jargon-free voice; audience is senior executives and technical leaders. He writes about technology strategy, operating models & efficiency, security/risk/trust, AI & automation, and leadership.

Below are recent items gathered today, grouped by category. Output one entry for EVERY category present in the gathered items, in the same order — never omit a category. For each category pick its 2–4 most significant, genuinely article-worthy items (skip pure product PR and noise); if a whole category is thin today, still include it with its single best item and say so plainly in that item's paragraph. For each selected item produce:
- "title": the cleaned-up headline,
- "url": its link (copy exactly from the item),
- "paragraph": 2–3 plain sentences — what happened and why it matters,
- "angle": ONE sentence — an article angle Luke could write in his own voice (his take/hook, not a recap).

Prefer items with a strategy, leadership, security, or AI-economics angle over deep tooling minutiae. Do NOT suggest angles that overlap what he has already published (listed below).

ALREADY PUBLISHED (avoid repeating these):
${published || '(none provided)'}

GATHERED ITEMS (JSON):
${JSON.stringify(gathered).slice(0, 60000)}

Return ONLY valid JSON, no markdown fences, shaped exactly:
{"categories":[{"name":"...","items":[{"title":"...","url":"...","paragraph":"...","angle":"..."}]}]}`

  const out = await bedrock.send(new ConverseCommand({
    modelId: MODEL,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 4500, temperature: 0.4 },
  }))
  const raw = out.output?.message?.content?.[0]?.text || ''
  const json = raw.replace(/^[\s\S]*?```(?:json)?/i, '').replace(/```[\s\S]*$/i, '').trim() || raw.trim()
  return JSON.parse(json.startsWith('{') ? json : raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
}

function emailHtml(radar, today) {
  const A = '#1a3c5e', M = '#0f7b6c'
  const cat = (c) => `
    <h3 style="font:700 15px/1.4 Arial;color:${A};margin:24px 0 6px;border-bottom:1px solid #eee;padding-bottom:6px">${esc(c.name)}</h3>
    ${(c.items || []).map((it) => `
      <div style="margin:0 0 14px">
        <a href="${esc(it.url)}" style="font:600 14px/1.4 Arial;color:${A};text-decoration:none">${esc(it.title)}</a>
        <div style="font:13px/1.55 Arial;color:#333;margin:3px 0 4px">${esc(it.paragraph)}</div>
        <div style="font:13px/1.5 Arial;color:${M}"><b>Angle:</b> ${esc(it.angle)}</div>
      </div>`).join('') || '<div style="font:13px Arial;color:#999">No standout items today.</div>'}`
  return `<!doctype html><html><body style="margin:0;background:#f6f6f6;padding:18px">
    <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:10px;padding:24px 26px;font-family:Arial,sans-serif">
      <div style="border-bottom:2px solid ${A};padding-bottom:10px;margin-bottom:8px">
        <span style="font:700 20px Georgia,serif;color:#1b1b1b">Content radar</span>
        <span style="font:13px Arial;color:#888"> — article seeds · ${today}</span>
      </div>
      <p style="font:12.5px/1.5 Arial;color:#888;margin:8px 0 0">Top topics across IT security, SD-WAN, SASE, AI, and GitHub — each with a paragraph and an angle you could write.</p>
      ${(radar.categories || []).map(cat).join('')}
      <div style="margin-top:22px;border-top:1px solid #eee;padding-top:10px;font:11px/1.5 Arial;color:#aaa">
        Sources: Google News + direct feeds + GitHub. Synthesis by Claude (${esc(MODEL)}). Phase 1 — engagement-scored social sources (/last30days) come later.
      </div>
    </div></body></html>`
}

export const handler = async () => {
  const today = new Date().toISOString().slice(0, 10)
  const [cats, gh, published] = await Promise.all([
    Promise.all(CATEGORIES.map(gatherCategory)),
    gatherGithub(),
    publishedTitles(),
  ])
  const gathered = [...cats, gh].filter((c) => c.items.length)
  console.log('gathered:', gathered.map((c) => `${c.name}=${c.items.length}`).join(', '))

  let radar
  try {
    radar = await synthesize(gathered, published)
  } catch (e) {
    // Fallback: still ship something useful — raw top items, no synthesis.
    radar = { categories: gathered.map((c) => ({ name: c.name, items: c.items.slice(0, 4).map((it) => ({ title: it.title, url: it.url, paragraph: it.source || '', angle: '(synthesis unavailable today)' })) })) }
    console.error('synthesis failed:', e?.message || e)
  }
  radar.generatedAt = new Date().toISOString()

  // store for the tools Radar tab (latest + dated archive)
  if (BUCKET) {
    const body = JSON.stringify(radar)
    await Promise.all([
      s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}/latest.json`, Body: body, ContentType: 'application/json', CacheControl: 'no-cache' })),
      s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}/${today}.json`, Body: body, ContentType: 'application/json' })),
    ])
  }

  // email
  if (FROM && TO) {
    const count = (radar.categories || []).reduce((s, c) => s + (c.items || []).length, 0)
    await ses.send(new SendEmailCommand({
      FromEmailAddress: FROM,
      Destination: { ToAddresses: [TO] },
      Content: { Simple: { Subject: { Data: `Content radar — ${count} article seeds (${today})`.slice(0, 100) }, Body: { Html: { Data: emailHtml(radar, today) } } } },
    }))
  }

  return { ok: true, categories: (radar.categories || []).length, items: (radar.categories || []).reduce((s, c) => s + (c.items || []).length, 0) }
}
