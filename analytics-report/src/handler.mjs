// nealon.tech daily traffic digest.
// Runs Athena queries over the CloudFront access logs, formats a plain-text
// report, and publishes it to SNS (email). Server-side, cookieless — no tracking
// scripts. Engagement/interaction time is NOT available from request logs.

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

// real page views: 2xx/3xx GETs, excluding static assets
const PAGE = `status < 400
  AND uri NOT LIKE '/assets/%' AND uri NOT LIKE '/og/%'
  AND uri NOT LIKE '%.ico' AND uri NOT LIKE '%.svg' AND uri NOT LIKE '%.png'
  AND uri NOT LIKE '%.js' AND uri NOT LIKE '%.css' AND uri NOT LIKE '%.woff2'
  AND uri NOT LIKE '%.xml' AND uri NOT LIKE '%.txt' AND uri NOT LIKE '%.webmanifest'`

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
const pad = (s, w) => String(s).padEnd(w)
const lpad = (s, w) => String(s).padStart(w)
const cleanUri = (u) => (u || '').replace(/\.html$/, '')

async function assistantUsage(days) {
  // token spend per day from budget#<date>, plus sessions/messages from sess#...#<date>
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
      const r = await ddb.send(new GetItemCommand({
        TableName: GUARDRAILS, Key: { pk: { S: `budget#${d}` } },
      }))
      if (r.Item?.count?.N) tokens += n(r.Item.count.N)
    }
    // sessions: scan sess# items, bucket by date suffix in pk
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

  const [win7, win30, yday, daily, articles, pages, referrers, crawlers] = await Promise.all([
    runQuery(`SELECT count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date >= current_date - interval '7' day AND ${PAGE}`),
    runQuery(`SELECT count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date >= current_date - interval '30' day AND ${PAGE}`),
    runQuery(`SELECT count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date = current_date - interval '1' day AND ${PAGE}`),
    runQuery(`SELECT date, count(*) views, count(DISTINCT request_ip) visitors FROM cf_logs WHERE date >= current_date - interval '7' day AND ${PAGE} GROUP BY date ORDER BY date DESC`),
    runQuery(`SELECT uri, count(*) reads, count(DISTINCT request_ip) readers FROM cf_logs WHERE date >= current_date - interval '7' day AND uri LIKE '/writing/%' AND status < 400 GROUP BY uri ORDER BY reads DESC LIMIT 10`),
    runQuery(`SELECT uri, count(*) hits FROM cf_logs WHERE date >= current_date - interval '7' day AND ${PAGE} GROUP BY uri ORDER BY hits DESC LIMIT 10`),
    runQuery(`SELECT referrer, count(*) hits FROM cf_logs WHERE date >= current_date - interval '7' day AND referrer <> '-' AND referrer NOT LIKE '%nealon.tech%' GROUP BY referrer ORDER BY hits DESC LIMIT 10`),
    runQuery(`SELECT lower(user_agent) ua, count(*) hits FROM cf_logs WHERE date >= current_date - interval '7' day AND (lower(user_agent) LIKE '%gptbot%' OR lower(user_agent) LIKE '%claudebot%' OR lower(user_agent) LIKE '%perplexity%' OR lower(user_agent) LIKE '%google-extended%' OR lower(user_agent) LIKE '%ccbot%' OR lower(user_agent) LIKE '%bytespider%' OR lower(user_agent) LIKE '%amazonbot%' OR lower(user_agent) LIKE '%applebot%' OR lower(user_agent) LIKE '%bingbot%') GROUP BY lower(user_agent) ORDER BY hits DESC LIMIT 8`),
  ])

  const v7 = n(win7[0]?.views), u7 = n(win7[0]?.visitors)
  const v30 = n(win30[0]?.views), u30 = n(win30[0]?.visitors)
  const vy = n(yday[0]?.views), uy = n(yday[0]?.visitors)
  const assistant = await assistantUsage(7)

  const L = []
  L.push(`nealon.tech — daily traffic digest`)
  L.push(today)
  L.push('')

  if (v30 === 0 && (!assistant || assistant.messages === 0)) {
    L.push('No traffic recorded in the last 30 days yet.')
    L.push('(Logs appear within ~1h of a visit. Share an article and the numbers will start moving.)')
  } else {
    L.push(`YESTERDAY        ${vy} views · ${uy} visitors`)
    L.push(`LAST 7 DAYS      ${v7} views · ${u7} visitors`)
    L.push(`LAST 30 DAYS     ${v30} views · ${u30} visitors`)
    L.push('')

    if (daily.length) {
      L.push('Daily (last 7d):')
      for (const d of daily) L.push(`  ${d.date}   ${lpad(d.views, 4)} views · ${lpad(d.visitors, 3)} visitors`)
      L.push('')
    }

    L.push('TOP ARTICLES (7d):')
    if (articles.length) {
      for (const a of articles) L.push(`  ${lpad(a.reads, 4)}  ${cleanUri(a.uri)}`)
    } else L.push('  (no article reads yet)')
    L.push('')

    L.push('TOP PAGES (7d):')
    if (pages.length) {
      for (const p of pages) L.push(`  ${lpad(p.hits, 4)}  ${cleanUri(p.uri)}`)
    } else L.push('  (none)')
    L.push('')

    L.push('WHERE THEY CAME FROM (7d):')
    if (referrers.length) {
      for (const r of referrers) L.push(`  ${lpad(r.hits, 4)}  ${r.referrer}`)
    } else L.push('  (no external referrers yet)')
    L.push('')

    L.push('AI CRAWLERS (7d) — signal that AIs are indexing/citing you:')
    if (crawlers.length) {
      for (const c of crawlers) L.push(`  ${lpad(c.hits, 4)}  ${c.ua.slice(0, 60)}`)
    } else L.push('  (none seen yet)')
    L.push('')

    if (assistant) {
      L.push(`ASSISTANT (7d):  ${assistant.sessions} sessions · ${assistant.messages} messages · ${assistant.tokens.toLocaleString()} tokens`)
      L.push('')
    }
  }

  L.push('—')
  L.push('Server-side, cookieless (CloudFront logs via Athena). No tracking scripts. No engagement-time (logs cannot see it).')

  const body = L.join('\n')
  const subject = v7 > 0
    ? `nealon.tech: ${v7} views, ${u7} visitors (7d)`
    : `nealon.tech: no traffic yet (7d)`

  await sns.send(new PublishCommand({
    TopicArn: TOPIC,
    Subject: subject.slice(0, 100),
    Message: body,
  }))
  return { ok: true, v7, u7 }
}
