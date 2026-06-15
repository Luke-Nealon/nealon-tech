// nealon.tech daily traffic digest.
// Runs Athena queries over the CloudFront access logs, formats a plain-text
// report, and publishes it to SNS (email). Server-side, cookieless — no tracking
// scripts. Engagement/interaction time is NOT available from request logs.
//
// v2: separates HUMAN traffic from bots/crawlers/scanners so the headline number
// is trustworthy. Bot detection is heuristic (user-agent + scanner paths).

import {
  AthenaClient, StartQueryExecutionCommand,
  GetQueryExecutionCommand, GetQueryResultsCommand,
} from '@aws-sdk/client-athena'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { DynamoDBClient, GetItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb'

const REGION = process.env.AWS_REGION || 'ap-southeast-2'
const athena = new AthenaClient({ region: REGION })
const sns = new SNSClient({ region: REGION })
const ddb = new DynamoDBClient({ region: REGION })

const DB = process.env.ATHENA_DB
const OUTPUT = process.env.ATHENA_OUTPUT
const TOPIC = process.env.TOPIC_ARN
const GUARDRAILS = process.env.GUARDRAILS_TABLE

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// successful, non-asset requests
const PAGE = `status < 400
  AND uri NOT LIKE '/assets/%' AND uri NOT LIKE '/og/%'
  AND uri NOT LIKE '%.ico' AND uri NOT LIKE '%.svg' AND uri NOT LIKE '%.png'
  AND uri NOT LIKE '%.js' AND uri NOT LIKE '%.css' AND uri NOT LIKE '%.woff2'
  AND uri NOT LIKE '%.xml' AND uri NOT LIKE '%.txt' AND uri NOT LIKE '%.webmanifest'`

// looks like a real browser, not a bot/script/scanner
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

// not a vuln-scanner / config-probe path
const NOTSCAN = `uri NOT LIKE '/.%' AND uri NOT LIKE '%.php' AND uri NOT LIKE '/wp-%'
  AND uri NOT LIKE '/vendor/%' AND uri NOT LIKE '/cgi-bin/%' AND uri <> '/index'
  AND uri NOT LIKE '%/.git%' AND uri NOT LIKE '%/.env%' AND uri NOT LIKE '%.aws%'
  AND uri NOT LIKE '%.ssh%' AND uri NOT LIKE '%.sql%' AND uri NOT LIKE '%backup%'`

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
    if (s === 'FAILED' || s === 'CANCELLED') {
      throw new Error(`Athena ${s}: ${ex.QueryExecution.Status.StateChangeReason || ''}`)
    }
    await sleep(800)
  }
  const out = []
  let token
  do {
    const res = await athena.send(new GetQueryResultsCommand({ QueryExecutionId: id, NextToken: token, MaxResults: 1000 }))
    const rows = res.ResultSet.Rows || []
    const start = out.length === 0 ? 1 : 0 // skip header row on first page only
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
const lpad = (s, w) => String(s).padStart(w)
const cleanUri = (u) => (u || '').replace(/\.html$/, '')

async function assistantUsage(days) {
  try {
    const dates = []
    const now = new Date()
    for (let i = 1; i <= days; i++) {
      const d = new Date(now); d.setUTCDate(now.getUTCDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }
    const dateSet = new Set(dates)
    let tokens = 0
    for (const d of dates) {
      const r = await ddb.send(new GetItemCommand({ TableName: GUARDRAILS, Key: { pk: { S: `budget#${d}` } } }))
      if (r.Item?.count?.N) tokens += n(r.Item.count.N)
    }
    let sessions = 0, messages = 0, token
    do {
      const r = await ddb.send(new ScanCommand({
        TableName: GUARDRAILS,
        FilterExpression: 'begins_with(pk, :p)',
        ExpressionAttributeValues: { ':p': { S: 'sess#' } },
        ExclusiveStartKey: token,
      }))
      for (const it of r.Items || []) {
        const d = (it.pk?.S || '').slice(-10)
        if (dateSet.has(d)) { sessions += 1; messages += n(it.count?.N) }
      }
      token = r.LastEvaluatedKey
    } while (token)
    return { tokens, sessions, messages }
  } catch (e) {
    return null
  }
}

export const handler = async () => {
  const today = new Date().toISOString().slice(0, 10)

  const [h7, h30, hy, total7, daily, articles, pages, referrers, aiCrawlers, searchCrawlers] = await Promise.all([
    runQuery(`SELECT count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date >= current_date - interval '7' day AND ${HUMAN}`),
    runQuery(`SELECT count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date >= current_date - interval '30' day AND ${HUMAN}`),
    runQuery(`SELECT count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date = current_date - interval '1' day AND ${HUMAN}`),
    runQuery(`SELECT count(*) views FROM cf_logs WHERE date >= current_date - interval '7' day AND ${PAGE}`),
    runQuery(`SELECT date, count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date >= current_date - interval '7' day AND ${HUMAN} GROUP BY date ORDER BY date DESC`),
    runQuery(`SELECT uri, count(*) reads, count(DISTINCT request_ip) readers FROM cf_logs WHERE date >= current_date - interval '7' day AND uri LIKE '/writing/%' AND ${HUMAN} GROUP BY uri ORDER BY reads DESC LIMIT 12`),
    runQuery(`SELECT uri, count(*) hits FROM cf_logs WHERE date >= current_date - interval '7' day AND ${HUMAN} GROUP BY uri ORDER BY hits DESC LIMIT 10`),
    runQuery(`SELECT url_decode(referrer) ref, count(*) hits FROM cf_logs WHERE date >= current_date - interval '7' day AND referrer <> '-' AND referrer NOT LIKE '%nealon.tech%' AND ${NOTBOT} GROUP BY url_decode(referrer) ORDER BY hits DESC LIMIT 10`),
    runQuery(`SELECT
        CASE
          WHEN lower(user_agent) LIKE '%gptbot%' THEN 'GPTBot (OpenAI)'
          WHEN lower(user_agent) LIKE '%oai-searchbot%' THEN 'OAI-SearchBot (OpenAI)'
          WHEN lower(user_agent) LIKE '%chatgpt%' THEN 'ChatGPT-User'
          WHEN lower(user_agent) LIKE '%claudebot%' THEN 'ClaudeBot (Anthropic)'
          WHEN lower(user_agent) LIKE '%anthropic%' OR lower(user_agent) LIKE '%claude-web%' THEN 'Anthropic'
          WHEN lower(user_agent) LIKE '%perplexity%' THEN 'PerplexityBot'
          WHEN lower(user_agent) LIKE '%google-extended%' THEN 'Google-Extended'
          WHEN lower(user_agent) LIKE '%ccbot%' THEN 'CCBot (Common Crawl)'
          WHEN lower(user_agent) LIKE '%bytespider%' THEN 'Bytespider (TikTok)'
          WHEN lower(user_agent) LIKE '%amazonbot%' THEN 'Amazonbot'
          ELSE 'other AI'
        END label, count(*) hits
      FROM cf_logs WHERE date >= current_date - interval '7' day AND ${AI_BOTS}
      GROUP BY 1 ORDER BY hits DESC`),
    runQuery(`SELECT count(*) hits FROM cf_logs WHERE date >= current_date - interval '7' day
      AND (lower(user_agent) LIKE '%googlebot%' OR lower(user_agent) LIKE '%bingbot%'
        OR lower(user_agent) LIKE '%applebot%' OR lower(user_agent) LIKE '%duckduckbot%'
        OR lower(user_agent) LIKE '%yandex%' OR lower(user_agent) LIKE '%baidu%')`),
  ])

  const v7 = n(h7[0]?.views), u7 = n(h7[0]?.visitors)
  const v30 = n(h30[0]?.views), u30 = n(h30[0]?.visitors)
  const vy = n(hy[0]?.views), uy = n(hy[0]?.visitors)
  const filtered = Math.max(0, n(total7[0]?.views) - v7)
  const assistant = await assistantUsage(7)

  const L = []
  L.push('nealon.tech — daily traffic digest')
  L.push(today)
  L.push('')

  if (v30 === 0 && (!assistant || assistant.messages === 0)) {
    L.push('No human traffic recorded in the last 30 days yet.')
    L.push(`(${filtered} bot/crawler/scanner hits were filtered out. Share an article and real numbers will start.)`)
  } else {
    L.push('HUMAN TRAFFIC  (bots, crawlers & scanners excluded)')
    L.push(`  Yesterday      ${vy} views · ${uy} visitors`)
    L.push(`  Last 7 days    ${v7} views · ${u7} visitors`)
    L.push(`  Last 30 days   ${v30} views · ${u30} visitors`)
    L.push(`  Filtered out as non-human (7d): ${filtered} hits`)
    L.push('')

    if (daily.length) {
      L.push('Daily, human (last 7d):')
      for (const d of daily) L.push(`  ${d.date}   ${lpad(d.views, 4)} views · ${lpad(d.visitors, 3)} visitors`)
      L.push('')
    }

    L.push('TOP ARTICLES (7d, human):')
    if (articles.length) for (const a of articles) L.push(`  ${lpad(a.reads, 4)}  ${cleanUri(a.uri)}`)
    else L.push('  (no human article reads yet)')
    L.push('')

    L.push('TOP PAGES (7d, human):')
    if (pages.length) for (const p of pages) L.push(`  ${lpad(p.hits, 4)}  ${cleanUri(p.uri)}`)
    else L.push('  (none)')
    L.push('')

    L.push('WHERE THEY CAME FROM (7d):')
    if (referrers.length) for (const r of referrers) L.push(`  ${lpad(r.hits, 4)}  ${r.ref}`)
    else L.push('  (no external referrers yet — LinkedIn app traffic often shows as direct)')
    L.push('')

    L.push('AI CRAWLERS (7d) — AIs indexing you for citation:')
    if (aiCrawlers.length) for (const c of aiCrawlers) L.push(`  ${lpad(c.hits, 4)}  ${c.label}`)
    else L.push('  (none seen yet)')
    const sc = n(searchCrawlers[0]?.hits)
    L.push(`Search crawlers (7d): ${sc} hits (Google/Bing/Apple/etc.)`)
    L.push('')

    if (assistant) {
      L.push(`ASSISTANT (7d):  ${assistant.sessions} sessions · ${assistant.messages} messages · ${assistant.tokens.toLocaleString()} tokens`)
      L.push('')
    }
  }

  L.push('—')
  L.push('Server-side, cookieless (CloudFront logs via Athena). Bot filtering is heuristic (user-agent + scanner paths).')
  L.push('No engagement-time — request logs cannot see it.')

  const body = L.join('\n')
  const subject = (v7 > 0 ? `nealon.tech: ${v7} human views, ${u7} visitors (7d)` : 'nealon.tech: no human traffic yet (7d)').slice(0, 100)

  await sns.send(new PublishCommand({ TopicArn: TOPIC, Subject: subject, Message: body }))
  return { ok: true, human7: v7, humanVisitors7: u7, filtered7: filtered }
}
