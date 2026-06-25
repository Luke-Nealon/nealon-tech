// nealon.tech daily traffic digest — v3.
// Athena over CloudFront logs -> HTML email via SES, with QuickChart graphs and
// accurate visitor countries (DB-IP Lite, bundled; IPs never leave AWS).
// Server-side, cookieless. No engagement/interaction time (request logs can't see it).

import {
  AthenaClient, StartQueryExecutionCommand,
  GetQueryExecutionCommand, GetQueryResultsCommand,
} from '@aws-sdk/client-athena'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { DynamoDBClient, GetItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb'
import maxmind from 'maxmind'
import path from 'path'

const REGION = process.env.AWS_REGION || 'ap-southeast-2'
const athena = new AthenaClient({ region: REGION })
const ses = new SESv2Client({ region: REGION })
const ddb = new DynamoDBClient({ region: REGION })

const DB = process.env.ATHENA_DB
const OUTPUT = process.env.ATHENA_OUTPUT
const GUARDRAILS = process.env.GUARDRAILS_TABLE
const FROM = process.env.FROM_EMAIL
const TO = process.env.TO_EMAIL

const MMDB = path.join(process.env.LAMBDA_TASK_ROOT || '.', 'dbip-country.mmdb')
let geoPromise
const geo = () => (geoPromise ||= maxmind.open(MMDB))

// IP -> ASN (DB-IP ASN Lite, bundled, CC BY 4.0) — used to drop datacenter/hosting "visitors"
// (browser-UA cloud bots) while SPARING privacy relays that carry real humans.
const ASN_MMDB = path.join(process.env.LAMBDA_TASK_ROOT || '.', 'dbip-asn.mmdb')
let asnPromise
const asnDb = () => (asnPromise ||= maxmind.open(ASN_MMDB))
// Scraper compute-clouds where browser-UA bots live (no human browses from an EC2 box).
const HOSTING_ASN = ['amazon', 'aws', 'google llc', 'google cloud', 'microsoft', 'azure', 'ovh',
  'hetzner', 'digitalocean', 'linode', 'vultr', 'scaleway', 'contabo', 'leaseweb', 'oracle',
  'alibaba', 'aliyun', 'tencent', 'huawei', 'm247', 'choopa', 'datacamp', 'cdn77', 'colocrossing',
  'hostinger', 'ionos', 'gcore', 'psychz', 'quadranet', 'clouvider', 'servers.com', 'constant company']
// Privacy relays / CDNs that carry REAL humans (iCloud Private Relay, Cloudflare WARP) — keep these.
const KEEP_ASN = ['apple', 'cloudflare', 'akamai', 'fastly', 'icloud', 'mullvad', 'nordvpn',
  'proton', 'expressvpn', 'private internet']
const isHostingOrg = (org) => {
  const o = (org || '').toLowerCase()
  if (!o || KEEP_ASN.some((k) => o.includes(k))) return false
  return HOSTING_ASN.some((k) => o.includes(k))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// The definitive list of real pages = the live sitemap. Counting human views only
// for paths that actually exist kills scanner probes (/wp/, /wordpress/, *.php,
// bogus /writing/<slug>) that the SPA serves a 200 for. Self-maintaining.
async function sitemapPaths() {
  try {
    const res = await fetch('https://nealon.tech/sitemap.xml')
    const xml = await res.text()
    const set = new Set(['/'])
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      try {
        const p = new URL(m[1]).pathname.replace(/\/$/, '') || '/'
        set.add(p)
        if (p !== '/') set.add(p + '.html') // CloudFront may log the rewritten path
      } catch {}
    }
    return [...set]
  } catch (e) { return [] }
}

const PAGE = `status < 400
  AND uri NOT LIKE '/assets/%' AND uri NOT LIKE '/og/%'
  AND uri NOT LIKE '%.ico' AND uri NOT LIKE '%.svg' AND uri NOT LIKE '%.png'
  AND uri NOT LIKE '%.js' AND uri NOT LIKE '%.css' AND uri NOT LIKE '%.woff2'
  AND uri NOT LIKE '%.xml' AND uri NOT LIKE '%.txt' AND uri NOT LIKE '%.webmanifest'`

const NOTBOT = `user_agent <> '-'
  AND lower(user_agent) NOT LIKE '%bot%' AND lower(user_agent) NOT LIKE '%crawl%'
  AND lower(user_agent) NOT LIKE '%spider%' AND lower(user_agent) NOT LIKE '%slurp%'
  AND lower(user_agent) NOT LIKE '%python%' AND lower(user_agent) NOT LIKE '%curl%'
  AND lower(user_agent) NOT LIKE '%wget%' AND lower(user_agent) NOT LIKE '%go-http%'
  AND lower(user_agent) NOT LIKE '%java/%' AND lower(user_agent) NOT LIKE '%okhttp%'
  AND lower(user_agent) NOT LIKE '%headless%' AND lower(user_agent) NOT LIKE '%scrapy%'
  AND lower(user_agent) NOT LIKE '%httpclient%' AND lower(user_agent) NOT LIKE '%libwww%'
  AND lower(user_agent) NOT LIKE '%facebookexternalhit%' AND lower(user_agent) NOT LIKE '%zgrab%'
  AND lower(user_agent) NOT LIKE '%masscan%' AND lower(user_agent) NOT LIKE '%censys%'
  AND lower(user_agent) NOT LIKE '%nuclei%' AND lower(user_agent) NOT LIKE '%fetch%'
  AND lower(user_agent) NOT LIKE '%scan%' AND lower(user_agent) NOT LIKE '%leakix%'
  AND lower(user_agent) NOT LIKE '%expanse%' AND lower(user_agent) NOT LIKE '%palo alto%'`

const NOTSCAN = `uri NOT LIKE '/.%' AND uri NOT LIKE '%.php' AND uri NOT LIKE '/wp-%'
  AND uri NOT LIKE '/vendor/%' AND uri NOT LIKE '/cgi-bin/%' AND uri <> '/index'
  AND uri NOT LIKE '%/.git%' AND uri NOT LIKE '%/.env%' AND uri NOT LIKE '%.aws%'
  AND uri NOT LIKE '%.ssh%' AND uri NOT LIKE '%.sql%' AND uri NOT LIKE '%backup%'
  AND uri NOT LIKE '/new%' AND uri NOT LIKE '/old%' AND uri NOT LIKE '/blog%'
  AND uri NOT LIKE '/config%' AND uri <> '/env' AND uri NOT LIKE '%for-pennies%'`

const AI_BOTS = `(lower(user_agent) LIKE '%gptbot%' OR lower(user_agent) LIKE '%oai-searchbot%'
  OR lower(user_agent) LIKE '%chatgpt%' OR lower(user_agent) LIKE '%claudebot%'
  OR lower(user_agent) LIKE '%anthropic%' OR lower(user_agent) LIKE '%claude-web%'
  OR lower(user_agent) LIKE '%perplexity%' OR lower(user_agent) LIKE '%google-extended%'
  OR lower(user_agent) LIKE '%ccbot%' OR lower(user_agent) LIKE '%bytespider%'
  OR lower(user_agent) LIKE '%amazonbot%' OR lower(user_agent) LIKE '%cohere%'
  OR lower(user_agent) LIKE '%diffbot%' OR lower(user_agent) LIKE '%youbot%')`

const HEAVY = 50 // max human page views per IP per day; above this is a scanner/bot, dropped

// Training crawlers we opted out of (robots.txt Disallow + edge 403). MIRROR of the
// block list in infra/cf-writing-rewrite.js — keep the two in sync. 403 = enforcement
// landed; 'served' = a hit that slipped through (pre-deploy, or a UA not in the function).
const TRAINING_BOTS = `(lower(user_agent) LIKE '%gptbot%' OR lower(user_agent) LIKE '%claudebot%'
  OR lower(user_agent) LIKE '%ccbot%' OR lower(user_agent) LIKE '%bytespider%'
  OR lower(user_agent) LIKE '%amazonbot%' OR lower(user_agent) LIKE '%cohere%'
  OR lower(user_agent) LIKE '%meta-externalagent%' OR lower(user_agent) LIKE '%ai2bot%'
  OR lower(user_agent) LIKE '%pangubot%' OR lower(user_agent) LIKE '%omgili%'
  OR lower(user_agent) LIKE '%webzio%' OR lower(user_agent) LIKE '%grokbot%')`
const TRAINING_LABEL = `CASE
  WHEN lower(user_agent) LIKE '%gptbot%' THEN 'GPTBot'
  WHEN lower(user_agent) LIKE '%claudebot%' THEN 'ClaudeBot'
  WHEN lower(user_agent) LIKE '%ccbot%' THEN 'CCBot'
  WHEN lower(user_agent) LIKE '%bytespider%' THEN 'Bytespider'
  WHEN lower(user_agent) LIKE '%amazonbot%' THEN 'Amazonbot'
  WHEN lower(user_agent) LIKE '%cohere%' THEN 'Cohere'
  WHEN lower(user_agent) LIKE '%meta-externalagent%' THEN 'meta-externalagent'
  WHEN lower(user_agent) LIKE '%ai2bot%' THEN 'AI2Bot'
  WHEN lower(user_agent) LIKE '%pangubot%' THEN 'PanguBot'
  WHEN lower(user_agent) LIKE '%omgili%' OR lower(user_agent) LIKE '%webzio%' THEN 'Webz.io'
  WHEN lower(user_agent) LIKE '%grokbot%' THEN 'GrokBot'
  ELSE 'other' END`

async function runQuery(sql) {
  const { QueryExecutionId: id } = await athena.send(new StartQueryExecutionCommand({
    QueryString: sql,
    QueryExecutionContext: { Database: DB },
    ResultConfiguration: { OutputLocation: OUTPUT },
  }))
  for (let i = 0; i < 90; i++) {
    const ex = await athena.send(new GetQueryExecutionCommand({ QueryExecutionId: id }))
    const s = ex.QueryExecution.Status.State
    if (s === 'SUCCEEDED') break
    if (s === 'FAILED' || s === 'CANCELLED') throw new Error(`Athena ${s}: ${ex.QueryExecution.Status.StateChangeReason || ''}`)
    await sleep(800)
  }
  const out = []
  let token
  do {
    const res = await athena.send(new GetQueryResultsCommand({ QueryExecutionId: id, NextToken: token, MaxResults: 1000 }))
    const rows = res.ResultSet.Rows || []
    const start = out.length === 0 ? 1 : 0
    if (!out.header) out.header = (rows[0]?.Data || []).map((d) => d.VarCharValue)
    for (let i = start; i < rows.length; i++) {
      const o = {}
      rows[i].Data.forEach((d, j) => { o[out.header[j]] = d.VarCharValue })
      out.push(o)
    }
    token = res.NextToken
  } while (token)
  return out
}

const n = (v) => Number(v || 0)
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const cleanUri = (u) => (u || '').replace(/\.html$/, '')

// QuickChart image URL (renders on demand, stateless)
function chart(cfg, w = 640, h = 280) {
  return `https://quickchart.io/chart?w=${w}&h=${h}&bkg=white&c=${encodeURIComponent(JSON.stringify(cfg))}`
}
// brand palette (nealon.tech), used email-safely: light body, dark header, mint accents.
const INK = '#0a0e13', MINT = '#5ce1c6', TEAL = '#2f9e88', TEAL_D = '#1f7c69', MUTE = '#8a949c', LINE = '#e8eaec', ROW = '#f2f3f4'
const ACCENT = TEAL
const num = (v) => n(v).toLocaleString('en-US')

async function assistantUsage(days) {
  try {
    const dates = []
    const now = new Date()
    for (let i = 1; i <= days; i++) { const d = new Date(now); d.setUTCDate(now.getUTCDate() - i); dates.push(d.toISOString().slice(0, 10)) }
    const dateSet = new Set(dates)
    let tokens = 0
    for (const d of dates) {
      const r = await ddb.send(new GetItemCommand({ TableName: GUARDRAILS, Key: { pk: { S: `budget#${d}` } } }))
      if (r.Item?.count?.N) tokens += n(r.Item.count.N)
    }
    let sessions = 0, messages = 0, token
    do {
      const r = await ddb.send(new ScanCommand({ TableName: GUARDRAILS, FilterExpression: 'begins_with(pk, :p)', ExpressionAttributeValues: { ':p': { S: 'sess#' } }, ExclusiveStartKey: token }))
      for (const it of r.Items || []) { const d = (it.pk?.S || '').slice(-10); if (dateSet.has(d)) { sessions += 1; messages += n(it.count?.N) } }
      token = r.LastEvaluatedKey
    } while (token)
    return { tokens, sessions, messages }
  } catch (e) { return null }
}

export const handler = async () => {
  const today = new Date().toISOString().slice(0, 10)
  const lookup = await geo()
  const asn = await asnDb()

  // page view = a successful HTML GET (drops 301 redirects, HEAD/OPTIONS, assets) from a
  // browser-like UA, on a real page. Allowlist (live sitemap) beats blocklist.
  const ALLOWED = await sitemapPaths()
  const BASE = `method = 'GET' AND status = 200 AND sc_content_type LIKE 'text/html%' AND ${NOTBOT}`
  const HUMAN = ALLOWED.length
    ? `${BASE} AND uri IN (${ALLOWED.map((p) => `'${p.replace(/'/g, "''")}'`).join(',')})`
    : `${BASE} AND ${PAGE} AND ${NOTSCAN}`
  // Even a real page (e.g. /) gets hammered by browser-UA scanners, which the allowlist can't
  // catch — so drop any IP that made more than HEAVY page views in one day (matches the tools
  // dashboard). human() builds a query over the human set for a window, with that exclusion.
  let dcClause = '' // populated below: excludes datacenter/hosting IPs (browser-UA cloud bots)
  const human = (win, select, extra = '', tail = '') => `WITH heavy AS (
      SELECT request_ip, date FROM cf_logs WHERE date ${win} AND ${HUMAN}
      GROUP BY request_ip, date HAVING count(*) > ${HEAVY})
    SELECT ${select} FROM cf_logs l
    WHERE l.date ${win} AND ${HUMAN}${extra}${dcClause}
      AND NOT EXISTS (SELECT 1 FROM heavy h WHERE h.request_ip = l.request_ip AND h.date = l.date)
    ${tail}`
  const W7 = `>= current_date - interval '7' day`, W30 = `>= current_date - interval '30' day`
  const WY = `= current_date - interval '1' day`, W14 = `>= current_date - interval '14' day`
  const VIEWS = `count(*) views, count(DISTINCT request_ip) visitors`

  // ---- phase 1: find the datacenter/hosting IPs inside the human set (30d) and exclude them from
  // every count below — drops browser-UA cloud bots while keeping Private Relay / WARP humans. ----
  const candIps = await runQuery(`SELECT DISTINCT request_ip FROM cf_logs WHERE date ${W30} AND ${HUMAN}`)
  const dcIps = candIps.map((r) => r.request_ip).filter((ip) => isHostingOrg(asn.get(ip)?.autonomous_system_organization))
  if (dcIps.length) dcClause = ` AND l.request_ip NOT IN (${dcIps.map((ip) => `'${ip.replace(/'/g, "''")}'`).join(',')})`

  const [h7, h30, hy, total7, daily, articles, pages, referrers, aiCrawlers, searchCrawlers, ips, enforce] = await Promise.all([
    runQuery(human(W7, VIEWS)),
    runQuery(human(W30, VIEWS)),
    runQuery(human(WY, VIEWS)),
    runQuery(`SELECT count(*) views FROM cf_logs WHERE date ${W7} AND ${PAGE}`),
    runQuery(human(W14, `l.date AS date, count(*) views`, '', `GROUP BY l.date ORDER BY l.date ASC`)),
    runQuery(human(W7, `l.uri AS uri, count(*) reads`, ` AND l.uri LIKE '/writing/%'`, `GROUP BY l.uri ORDER BY reads DESC LIMIT 8`)),
    runQuery(human(W7, `l.uri AS uri, count(*) hits`, '', `GROUP BY l.uri ORDER BY hits DESC LIMIT 8`)),
    runQuery(human(W7, `url_decode(l.referrer) ref, count(*) hits`, ` AND l.referrer <> '-' AND l.referrer NOT LIKE '%nealon.tech%'`, `GROUP BY url_decode(l.referrer) ORDER BY hits DESC LIMIT 8`)),
    runQuery(`SELECT CASE
        WHEN lower(user_agent) LIKE '%gptbot%' THEN 'GPTBot (OpenAI)'
        WHEN lower(user_agent) LIKE '%oai-searchbot%' THEN 'OAI-SearchBot'
        WHEN lower(user_agent) LIKE '%chatgpt%' THEN 'ChatGPT-User'
        WHEN lower(user_agent) LIKE '%claudebot%' THEN 'ClaudeBot (Anthropic)'
        WHEN lower(user_agent) LIKE '%anthropic%' OR lower(user_agent) LIKE '%claude-web%' THEN 'Anthropic'
        WHEN lower(user_agent) LIKE '%perplexity%' THEN 'PerplexityBot'
        WHEN lower(user_agent) LIKE '%google-extended%' THEN 'Google-Extended'
        WHEN lower(user_agent) LIKE '%ccbot%' THEN 'CCBot (Common Crawl)'
        WHEN lower(user_agent) LIKE '%bytespider%' THEN 'Bytespider'
        WHEN lower(user_agent) LIKE '%amazonbot%' THEN 'Amazonbot'
        ELSE 'other AI' END label, count(*) hits
      FROM cf_logs WHERE date >= current_date - interval '7' day AND ${AI_BOTS} GROUP BY 1 ORDER BY hits DESC`),
    runQuery(`SELECT count(*) hits FROM cf_logs WHERE date >= current_date - interval '7' day AND (lower(user_agent) LIKE '%googlebot%' OR lower(user_agent) LIKE '%bingbot%' OR lower(user_agent) LIKE '%applebot%' OR lower(user_agent) LIKE '%duckduckbot%' OR lower(user_agent) LIKE '%yandex%' OR lower(user_agent) LIKE '%baidu%')`),
    runQuery(human(W7, `l.request_ip AS request_ip, count(*) hits`, '', `GROUP BY l.request_ip`)),
    runQuery(`SELECT ${TRAINING_LABEL} bot, CASE WHEN status = 403 THEN 'blocked' ELSE 'served' END outcome, count(*) hits
      FROM cf_logs WHERE date >= current_date - interval '7' day AND ${TRAINING_BOTS} GROUP BY 1, 2 ORDER BY 1`),
  ])

  const v7 = n(h7[0]?.views), u7 = n(h7[0]?.visitors)
  const v30 = n(h30[0]?.views), u30 = n(h30[0]?.visitors)
  const vy = n(hy[0]?.views), uy = n(hy[0]?.visitors)
  const filtered = Math.max(0, n(total7[0]?.views) - v7)
  const assistant = await assistantUsage(7)

  // crawler-policy enforcement: the training crawlers we opted out of, split 403 vs served
  const enf = {}
  for (const r of enforce) { (enf[r.bot] ||= { blocked: 0, served: 0 })[r.outcome] += n(r.hits) }
  const enfRows = Object.entries(enf).sort((a, b) => (b[1].blocked + b[1].served) - (a[1].blocked + a[1].served))
  const enfBlocked = enfRows.reduce((s, [, v]) => s + v.blocked, 0)
  const enfServed = enfRows.reduce((s, [, v]) => s + v.served, 0)

  // AI bots split into the two that matter: answer engines (welcome — they cite you) vs the
  // training crawlers above (you opted out — turned away). ClaudeBot (training) is turned away;
  // Claude's answer bot matches the 'Anthropic' label and is welcomed.
  const ANSWER = { 'OAI-SearchBot': 'ChatGPT Search (OpenAI)', 'ChatGPT-User': 'ChatGPT (on-demand)', 'PerplexityBot': 'Perplexity', 'Anthropic': 'Claude (Anthropic)', 'Google-Extended': 'Google / Gemini' }
  const answerEngines = aiCrawlers.filter((c) => ANSWER[c.label]).map((c) => ({ label: ANSWER[c.label], hits: n(c.hits) })).sort((a, b) => b.hits - a.hits)
  const answerTotal = answerEngines.reduce((s, c) => s + c.hits, 0)

  // geolocate human visitor IPs -> country
  const byCountry = {}
  for (const r of ips) {
    const g = lookup.get(r.request_ip)
    const name = g?.country?.names?.en || (g?.country?.iso_code) || 'Unknown'
    if (!byCountry[name]) byCountry[name] = { visitors: 0, views: 0 }
    byCountry[name].visitors += 1
    byCountry[name].views += n(r.hits)
  }
  const countries = Object.entries(byCountry).map(([k, v]) => ({ country: k, ...v })).sort((a, b) => b.visitors - a.visitors)
  const topCountries = countries.slice(0, 8)

  // charts
  const trendUrl = chart({ type: 'bar', data: { labels: daily.map((d) => d.date.slice(5)), datasets: [{ data: daily.map((d) => n(d.views)), backgroundColor: TEAL }] }, options: { legend: { display: false }, title: { display: true, text: 'Human page views per day · last 14 days' } } })
  const artUrl = articles.length ? chart({ type: 'horizontalBar', data: { labels: articles.map((a) => cleanUri(a.uri).replace('/writing/', '')), datasets: [{ data: articles.map((a) => n(a.reads)), backgroundColor: TEAL }] }, options: { legend: { display: false }, title: { display: true, text: 'Most-read articles · last 7 days' } } }, 640, 300) : null
  const ctyUrl = topCountries.length ? chart({ type: 'horizontalBar', data: { labels: topCountries.map((c) => c.country), datasets: [{ data: topCountries.map((c) => c.visitors), backgroundColor: '#394350' }] }, options: { legend: { display: false }, title: { display: true, text: 'Visitors by country · last 7 days' } } }, 640, 300) : null

  // ---- HTML ----
  const card = (label, views, visitors) => `<td width="33.3%" style="padding:0 5px;vertical-align:top">
    <div style="border:1px solid ${LINE};border-top:3px solid ${MINT};border-radius:8px;padding:13px 10px;text-align:center">
      <div style="font:700 10px/1.3 'Courier New',monospace;letter-spacing:.1em;color:${TEAL_D};text-transform:uppercase">${label}</div>
      <div style="font:800 28px/1.1 Georgia,serif;color:${INK};margin:5px 0 0">${num(views)}</div>
      <div style="font:700 11px/1.3 Arial;color:${TEAL_D};letter-spacing:.02em">page views</div>
      <div style="font:12px/1.4 Arial;color:${MUTE};margin-top:3px">${num(visitors)} visitors</div></div></td>`
  const rows = (arr, fmt) => arr.length ? arr.map(fmt).join('') : `<tr><td style="font:13px Arial;color:${MUTE};padding:5px 0">—</td></tr>`
  const sec = (title, note = '') => `<div style="margin:22px 0 7px"><span style="display:inline-block;width:8px;height:8px;background:${MINT};border-radius:2px;margin-right:9px;vertical-align:middle"></span><span style="font:800 13px Arial;color:${INK}">${title}</span>${note ? `<span style="font:12px Arial;color:${MUTE}"> — ${note}</span>` : ''}</div>`
  const tbl = (title, inner, note = '') => `${sec(title, note)}<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${inner}</table>`
  const li = (a, b) => `<tr><td style="font:13px/1.7 Arial;color:#2b333a;padding:4px 0;border-bottom:1px solid ${ROW}">${a}</td><td style="font:13px/1.7 Arial;color:${INK};font-weight:700;text-align:right;padding:4px 0;border-bottom:1px solid ${ROW}">${b}</td></tr>`

  let html
  if (v30 === 0 && (!assistant || assistant.messages === 0)) {
    html = `<div style="font:14px Arial;color:#333">No human traffic in the last 30 days yet. (${num(filtered)} bot / crawler / scanner hits filtered out.) Share an article and the numbers will move.</div>`
  } else {
    html = `
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${card('Yesterday', vy, uy)}
      ${card('Last 7 days', v7, u7)}
      ${card('Last 30 days', v30, u30)}
    </tr></table>
    <div style="font:12px/1.6 Arial;color:${MUTE};margin:10px 2px 0">
      <b style="color:#2b333a">Page views</b> = pages opened · <b style="color:#2b333a">visitors</b> = unique people (one person who reads 3 pages = 1 visitor, 3 views). Each box is the total over that period — they overlap.<br>
      Real human reads only — <b style="color:#2b333a">${num(filtered)}</b> bot / crawler / scanner hits were stripped out (normal; bots crawl constantly).${dcIps.length ? ` A further <b style="color:#2b333a">${num(dcIps.length)}</b> datacenter / hosting IPs (cloud bots) were removed — Apple Private Relay &amp; Cloudflare WARP are kept as human.` : ''}
    </div>
    <div style="margin:18px 0 4px"><img src="${trendUrl}" width="640" alt="Human page views per day" style="max-width:100%;border:1px solid ${LINE};border-radius:8px"></div>
    ${artUrl ? `<div style="margin:14px 0"><img src="${artUrl}" width="640" alt="Most-read articles" style="max-width:100%;border:1px solid ${LINE};border-radius:8px"></div>` : ''}
    ${ctyUrl ? `<div style="margin:14px 0"><img src="${ctyUrl}" width="640" alt="Visitors by country" style="max-width:100%;border:1px solid ${LINE};border-radius:8px"></div>` : tbl('Visitors by country', rows(topCountries, (c) => li(esc(c.country), num(c.visitors))))}
    ${tbl('Top pages', rows(pages, (p) => li(esc(cleanUri(p.uri)), num(p.hits))))}
    ${tbl('AI answer engines reading you', rows(answerEngines, (c) => li(esc(c.label), num(c.hits))), 'they read your pages to cite you in AI answers — the goal')}
    <div style="font:12px Arial;color:${MUTE};margin:5px 2px 12px">${answerTotal > 0 ? `<b style="color:${TEAL_D}">${num(answerTotal)}</b> answer-engine reads this week, plus <b>${num(n(searchCrawlers[0]?.hits))}</b> classic search-crawler visits (Google / Bing / Apple).` : `No answer-engine reads yet this week. ${num(n(searchCrawlers[0]?.hits))} classic search-crawler visits.`}</div>
    ${tbl('Training crawlers turned away', rows(enfRows, ([bot, v]) => li(esc(bot), `${num(v.blocked)} blocked${v.served ? ` <span style="color:${MUTE};font-weight:400">· ${num(v.served)} slipped through</span>` : ''}`)), "you've opted out of AI training; these were blocked at the edge")}
    <div style="font:12px Arial;color:${MUTE};margin:5px 2px 0"><b style="color:#2b333a">${num(enfBlocked)}</b> blocked, ${num(enfServed)} served. Compliant bots stop trying once they re-read robots.txt, so both trend toward 0; the rest are non-compliant crawlers. (Spoofed browser-UAs can't be counted.)</div>
    ${referrers.length ? tbl('Referrers', rows(referrers, (r) => li(esc(r.ref), num(r.hits)))) : ''}
    ${assistant ? tbl('AI assistant', li('Sessions / messages', `${num(assistant.sessions)} / ${num(assistant.messages)}`) + li('Tokens used', num(assistant.tokens))) : ''}
    `
  }

  const htmlDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
    <body style="margin:0;background:#eef0f1;padding:18px;font-family:Arial,sans-serif">
    <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e5e7">
      <div style="background:${INK};padding:17px 26px">
        <span style="font:800 18px Georgia,serif;color:#fff;letter-spacing:.5px">LN<span style="color:${MINT}">.</span></span>
        <span style="font:700 14px Arial;color:#fff;margin-left:9px">nealon.tech</span>
        <span style="font:12px Arial;color:#8a949c"> · daily traffic digest · ${today}</span>
      </div>
      <div style="padding:22px 26px">
        ${html}
        <div style="margin-top:26px;border-top:1px solid ${LINE};padding-top:11px;font:11px/1.5 Arial;color:#a7afb5">
          Server-side &amp; cookieless (CloudFront logs via Athena); bot filtering is heuristic; no engagement-time (request logs can't see it).<br>
          Countries via DB-IP Lite (<a href="https://db-ip.com" style="color:#a7afb5">db-ip.com</a>, CC BY 4.0) — IPs resolved inside AWS, never shared. Charts via QuickChart.
        </div>
      </div>
    </div></body></html>`

  // plain-text fallback
  const T = []
  T.push(`nealon.tech — daily digest ${today}`, '')
  T.push(`Yesterday: ${vy} page views / ${uy} visitors`)
  T.push(`7 days:    ${v7} page views / ${u7} visitors   (${filtered} bot/crawler/scanner hits filtered out)`)
  T.push(`30 days:   ${v30} page views / ${u30} visitors`)
  if (dcIps.length) T.push(`(also removed ${dcIps.length} datacenter/hosting IPs — cloud bots; Private Relay & WARP kept as human)`)
  T.push('')
  T.push('Top countries (7d): ' + (topCountries.map((c) => `${c.country} ${c.visitors}`).join(', ') || 'none'))
  T.push('Top articles (7d): ' + (articles.map((a) => `${cleanUri(a.uri).replace('/writing/', '')} ${a.reads}`).join(', ') || 'none'))
  T.push('AI answer engines reading you (7d): ' + (answerEngines.map((c) => `${c.label} ${c.hits}`).join(', ') || 'none') + ` (+ ${n(searchCrawlers[0]?.hits)} search crawlers)`)
  T.push(`Training crawlers turned away (7d): ${enfBlocked} blocked, ${enfServed} served`)
  if (assistant) T.push(`Assistant (7d): ${assistant.sessions} sessions, ${assistant.messages} messages, ${assistant.tokens} tokens`)

  const subject = (v7 > 0 ? `nealon.tech: ${v7} human views, ${u7} visitors (7d)` : 'nealon.tech: no human traffic yet (7d)').slice(0, 100)

  await ses.send(new SendEmailCommand({
    FromEmailAddress: FROM,
    Destination: { ToAddresses: [TO] },
    Content: { Simple: { Subject: { Data: subject }, Body: { Html: { Data: htmlDoc }, Text: { Data: T.join('\n') } } } },
  }))
  return { ok: true, human7: v7, visitors7: u7, filtered7: filtered, dcExcluded: dcIps.length, countries: topCountries.length }
}
