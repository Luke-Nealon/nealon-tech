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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
  AND lower(user_agent) NOT LIKE '%nuclei%' AND lower(user_agent) NOT LIKE '%fetch%'`

const NOTSCAN = `uri NOT LIKE '/.%' AND uri NOT LIKE '%.php' AND uri NOT LIKE '/wp-%'
  AND uri NOT LIKE '/vendor/%' AND uri NOT LIKE '/cgi-bin/%' AND uri <> '/index'
  AND uri NOT LIKE '%/.git%' AND uri NOT LIKE '%/.env%' AND uri NOT LIKE '%.aws%'
  AND uri NOT LIKE '%.ssh%' AND uri NOT LIKE '%.sql%' AND uri NOT LIKE '%backup%'
  AND uri NOT LIKE '/new%' AND uri NOT LIKE '/old%' AND uri NOT LIKE '/blog%'
  AND uri NOT LIKE '/config%' AND uri <> '/env' AND uri NOT LIKE '%for-pennies%'`

const HUMAN = `${PAGE} AND ${NOTBOT} AND ${NOTSCAN}`
const AI_BOTS = `(lower(user_agent) LIKE '%gptbot%' OR lower(user_agent) LIKE '%oai-searchbot%'
  OR lower(user_agent) LIKE '%chatgpt%' OR lower(user_agent) LIKE '%claudebot%'
  OR lower(user_agent) LIKE '%anthropic%' OR lower(user_agent) LIKE '%claude-web%'
  OR lower(user_agent) LIKE '%perplexity%' OR lower(user_agent) LIKE '%google-extended%'
  OR lower(user_agent) LIKE '%ccbot%' OR lower(user_agent) LIKE '%bytespider%'
  OR lower(user_agent) LIKE '%amazonbot%' OR lower(user_agent) LIKE '%cohere%'
  OR lower(user_agent) LIKE '%diffbot%' OR lower(user_agent) LIKE '%youbot%')`

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
const ACCENT = '#1a3c5e'

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

  const [h7, h30, hy, total7, daily, articles, pages, referrers, aiCrawlers, searchCrawlers, ips] = await Promise.all([
    runQuery(`SELECT count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date >= current_date - interval '7' day AND ${HUMAN}`),
    runQuery(`SELECT count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date >= current_date - interval '30' day AND ${HUMAN}`),
    runQuery(`SELECT count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date = current_date - interval '1' day AND ${HUMAN}`),
    runQuery(`SELECT count(*) views FROM cf_logs WHERE date >= current_date - interval '7' day AND ${PAGE}`),
    runQuery(`SELECT date, count(*) views FROM cf_logs WHERE date >= current_date - interval '14' day AND ${HUMAN} GROUP BY date ORDER BY date ASC`),
    runQuery(`SELECT uri, count(*) reads FROM cf_logs WHERE date >= current_date - interval '7' day AND uri LIKE '/writing/%' AND ${HUMAN} GROUP BY uri ORDER BY reads DESC LIMIT 8`),
    runQuery(`SELECT uri, count(*) hits FROM cf_logs WHERE date >= current_date - interval '7' day AND ${HUMAN} GROUP BY uri ORDER BY hits DESC LIMIT 8`),
    runQuery(`SELECT url_decode(referrer) ref, count(*) hits FROM cf_logs WHERE date >= current_date - interval '7' day AND referrer <> '-' AND referrer NOT LIKE '%nealon.tech%' AND ${NOTBOT} GROUP BY url_decode(referrer) ORDER BY hits DESC LIMIT 8`),
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
    runQuery(`SELECT request_ip, count(*) hits FROM cf_logs WHERE date >= current_date - interval '7' day AND ${HUMAN} GROUP BY request_ip`),
  ])

  const v7 = n(h7[0]?.views), u7 = n(h7[0]?.visitors)
  const v30 = n(h30[0]?.views), u30 = n(h30[0]?.visitors)
  const vy = n(hy[0]?.views), uy = n(hy[0]?.visitors)
  const filtered = Math.max(0, n(total7[0]?.views) - v7)
  const assistant = await assistantUsage(7)

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
  const trendUrl = chart({ type: 'bar', data: { labels: daily.map((d) => d.date.slice(5)), datasets: [{ label: 'views', data: daily.map((d) => n(d.views)), backgroundColor: ACCENT }] }, options: { legend: { display: false }, title: { display: true, text: 'Human page views / day (14d)' } } })
  const artUrl = articles.length ? chart({ type: 'horizontalBar', data: { labels: articles.map((a) => cleanUri(a.uri).replace('/writing/', '')), datasets: [{ data: articles.map((a) => n(a.reads)), backgroundColor: ACCENT }] }, options: { legend: { display: false }, title: { display: true, text: 'Top articles (7d, human reads)' } } }, 640, 300) : null
  const ctyUrl = topCountries.length ? chart({ type: 'horizontalBar', data: { labels: topCountries.map((c) => c.country), datasets: [{ data: topCountries.map((c) => c.visitors), backgroundColor: '#2e8b8b' }] }, options: { legend: { display: false }, title: { display: true, text: 'Visitors by country (7d)' } } }, 640, 300) : null

  // ---- HTML ----
  const card = (label, big, sub) => `<td style="padding:10px 16px;border:1px solid #e3e3e3;border-radius:6px;text-align:center">
    <div style="font:11px/1.4 Arial;letter-spacing:.08em;color:#777;text-transform:uppercase">${label}</div>
    <div style="font:700 24px/1.2 Georgia,serif;color:#1b1b1b">${big}</div>
    <div style="font:12px/1.4 Arial;color:#999">${sub}</div></td>`
  const rows = (arr, fmt) => arr.length ? arr.map(fmt).join('') : `<tr><td style="font:13px Arial;color:#999;padding:4px 0">—</td></tr>`
  const tbl = (title, inner) => `<h3 style="font:700 14px/1.4 Arial;color:${ACCENT};margin:22px 0 8px;letter-spacing:.04em">${title}</h3><table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${inner}</table>`
  const li = (a, b) => `<tr><td style="font:13px/1.6 Arial;color:#333;padding:3px 0">${a}</td><td style="font:13px/1.6 Arial;color:#333;text-align:right;padding:3px 0">${b}</td></tr>`

  let html
  if (v30 === 0 && (!assistant || assistant.messages === 0)) {
    html = `<div style="font:14px Arial;color:#333">No human traffic in the last 30 days yet. (${filtered} bot/crawler/scanner hits filtered out.) Share an article and the numbers will move.</div>`
  } else {
    html = `
    <table cellpadding="0" cellspacing="8" style="border-collapse:separate"><tr>
      ${card('Yesterday', vy, `${uy} visitors`)}
      ${card('Last 7 days', v7, `${u7} visitors`)}
      ${card('Last 30 days', v30, `${u30} visitors`)}
    </tr></table>
    <div style="font:12px Arial;color:#999;margin:6px 2px 0">Filtered out as non-human (7d): <b>${filtered}</b> hits (bots, crawlers, scanners)</div>
    <div style="margin:18px 0"><img src="${trendUrl}" width="640" alt="views per day" style="max-width:100%;border:1px solid #eee;border-radius:6px"></div>
    ${artUrl ? `<div style="margin:14px 0"><img src="${artUrl}" width="640" alt="top articles" style="max-width:100%;border:1px solid #eee;border-radius:6px"></div>` : ''}
    ${ctyUrl ? `<div style="margin:14px 0"><img src="${ctyUrl}" width="640" alt="visitors by country" style="max-width:100%;border:1px solid #eee;border-radius:6px"></div>` : tbl('Visitors by country (7d)', rows(topCountries, (c) => li(esc(c.country), c.visitors)))}
    ${tbl('Top pages (7d, human)', rows(pages, (p) => li(esc(cleanUri(p.uri)), p.hits)))}
    ${tbl('Where they came from (7d)', referrers.length ? rows(referrers, (r) => li(esc(r.ref), r.hits)) : `<tr><td style="font:13px Arial;color:#999;padding:4px 0">No external referrers yet — LinkedIn app traffic usually shows as direct.</td></tr>`)}
    ${tbl('AI crawlers (7d) — AIs indexing you for citation', rows(aiCrawlers, (c) => li(esc(c.label), c.hits)) + li('<i>Search crawlers (Google/Bing/Apple…)</i>', n(searchCrawlers[0]?.hits)))}
    ${assistant ? tbl('Assistant (7d)', li('Sessions / messages', `${assistant.sessions} / ${assistant.messages}`) + li('Tokens', assistant.tokens.toLocaleString())) : ''}
    `
  }

  const htmlDoc = `<!doctype html><html><body style="margin:0;background:#f6f6f6;padding:18px">
    <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:10px;padding:24px 26px;font-family:Arial,sans-serif">
      <div style="border-bottom:2px solid ${ACCENT};padding-bottom:10px;margin-bottom:16px">
        <span style="font:700 20px Georgia,serif;color:#1b1b1b">nealon.tech</span>
        <span style="font:13px Arial;color:#888"> — daily traffic digest · ${today}</span>
      </div>
      ${html}
      <div style="margin-top:24px;border-top:1px solid #eee;padding-top:10px;font:11px/1.5 Arial;color:#aaa">
        Server-side, cookieless (CloudFront logs via Athena). Bot filtering is heuristic. No engagement-time — request logs can't see it.<br>
        Visitor countries via DB-IP Lite (<a href="https://db-ip.com" style="color:#aaa">db-ip.com</a>, CC BY 4.0); IPs resolved inside AWS, never shared. Charts via QuickChart.
      </div>
    </div></body></html>`

  // plain-text fallback
  const T = []
  T.push(`nealon.tech — daily digest ${today}`, '')
  T.push(`Yesterday: ${vy} views / ${uy} visitors`)
  T.push(`7 days:    ${v7} views / ${u7} visitors   (filtered non-human: ${filtered})`)
  T.push(`30 days:   ${v30} views / ${u30} visitors`, '')
  T.push('Top countries (7d): ' + (topCountries.map((c) => `${c.country} ${c.visitors}`).join(', ') || 'none'))
  T.push('Top articles (7d): ' + (articles.map((a) => `${cleanUri(a.uri).replace('/writing/', '')} ${a.reads}`).join(', ') || 'none'))
  T.push('AI crawlers (7d): ' + (aiCrawlers.map((c) => `${c.label} ${c.hits}`).join(', ') || 'none'))
  if (assistant) T.push(`Assistant (7d): ${assistant.sessions} sessions, ${assistant.messages} messages, ${assistant.tokens} tokens`)

  const subject = (v7 > 0 ? `nealon.tech: ${v7} human views, ${u7} visitors (7d)` : 'nealon.tech: no human traffic yet (7d)').slice(0, 100)

  await ses.send(new SendEmailCommand({
    FromEmailAddress: FROM,
    Destination: { ToAddresses: [TO] },
    Content: { Simple: { Subject: { Data: subject }, Body: { Html: { Data: htmlDoc }, Text: { Data: T.join('\n') } } } },
  }))
  return { ok: true, human7: v7, visitors7: u7, filtered7: filtered, countries: topCountries.length }
}
