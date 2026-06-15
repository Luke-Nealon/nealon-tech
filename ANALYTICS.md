# Analytics — CloudFront logs via Athena

Privacy-clean, server-side analytics. No tracking scripts, no cookies (honours the privacy page).
Cost: Athena is pay-per-query ($5/TB scanned, 10 MB minimum ≈ $0.00005/query). No idle cost.

## What's set up
- **CloudFront logging** enabled on distribution `E2G1CF1OWQH84U` → `s3://nealon-tech-logs-389901108572/cf/`
- **Athena** database `nealon_logs`, table `cf_logs` (region **ap-southeast-2**)
- Query results → `s3://nealon-tech-logs-389901108572/athena-results/` (auto-expire 14 days)
- Raw logs auto-expire after 365 days
- Logs appear within minutes–1 hour of traffic; queries return empty until then.

## How to run a query
**Console:** Athena (ap-southeast-2) → Database `nealon_logs` → paste a query → Run.
**CLI:**
```sh
aws athena start-query-execution \
  --query-string "SELECT ..." \
  --result-configuration OutputLocation=s3://nealon-tech-logs-389901108572/athena-results/ \
  --region ap-southeast-2 --profile personal
# then: aws athena get-query-results --query-execution-id <id> --region ap-southeast-2 --profile personal
```

## Handy queries

Page views per day (last 30 days):
```sql
SELECT date, count(*) AS views
FROM nealon_logs.cf_logs
WHERE status < 400 AND uri NOT LIKE '/assets/%'
GROUP BY date ORDER BY date DESC LIMIT 30;
```

Top pages:
```sql
SELECT uri, count(*) AS hits
FROM nealon_logs.cf_logs
WHERE status < 400 AND uri NOT LIKE '/assets/%' AND uri NOT LIKE '%.svg'
GROUP BY uri ORDER BY hits DESC LIMIT 25;
```

Top referrers (where traffic comes from — incl. AI/chat citations):
```sql
SELECT referrer, count(*) AS hits
FROM nealon_logs.cf_logs
WHERE referrer <> '-' GROUP BY referrer ORDER BY hits DESC LIMIT 25;
```

Roughly unique visitors per day (distinct IPs — aggregate only):
```sql
SELECT date, count(DISTINCT request_ip) AS visitors
FROM nealon_logs.cf_logs
WHERE status < 400 GROUP BY date ORDER BY date DESC LIMIT 30;
```

Article reads:
```sql
SELECT uri, count(*) AS reads
FROM nealon_logs.cf_logs
WHERE uri LIKE '/writing/%' AND status < 400
GROUP BY uri ORDER BY reads DESC;
```

Assistant usage (chat requests hit the Lambda URL, not CloudFront — check Lambda/DynamoDB instead;
the $5/day budget counter in DynamoDB table `nealon-ai-guardrails` keyed `budget#<date>` is the
cheapest proxy for assistant activity).

## Daily email digest (automated)

A scheduled Lambda emails an **HTML traffic digest** every day — no dashboard to log into.
SAM app in `analytics-report/` (stack `nealon-analytics-report`, ap-southeast-2, profile `personal`).

- **What it sends:** human views/visitors (yesterday / 7d / 30d) with bots filtered out and the
  filtered count shown; **graphs** (daily-trend bar, top-articles bar, visitors-by-country bar) via
  QuickChart; top pages; referrers; AI-crawler hits (GPTBot/ClaudeBot/Perplexity/…) split from
  search crawlers; and assistant usage from `nealon-ai-guardrails`. Human-vs-bot split is heuristic
  (user-agent + scanner-path filters). Gracefully reports "no traffic yet".
- **Visitor countries:** accurate, from a bundled **DB-IP Lite Country** mmdb (`src/dbip-country.mmdb`,
  CC BY 4.0) read with the `maxmind` npm package — **IPs are resolved inside the Lambda, never sent
  out.** No literal choropleth map (the free QuickChart choropleth was unreliable; a country bar
  chart is used instead). Refresh the DB monthly:
  `curl -fsSL https://download.db-ip.com/free/dbip-country-lite-YYYY-MM.mmdb.gz | gunzip > src/dbip-country.mmdb`
- **Delivery:** **SES** HTML email (no SNS). Sends from `FromEmail` (default `reports@nealon.tech`)
  to `ToEmail` (default `luke@nealon.tech`). The `nealon.tech` SES domain identity is already
  verified (Easy DKIM); domain verification also covers the `@nealon.tech` recipient in the SES
  sandbox, so no production-access request is needed. No subscription to confirm.
- **Schedule:** `cron(0 22 * * ? *)` = 22:00 UTC ≈ 08:00 Sydney (AEST; 09:00 during AEDT).
- **No engagement/interaction time** — request logs can't see it (would need a cookieless client
  script like Plausible/Cloudflare; deliberately not added, to honour the privacy page).
- **Setup before deploy** (DB + deps are gitignored): `cd analytics-report/src && npm install` and
  download the mmdb (command above).
- **Redeploy:** `cd analytics-report && sam build && sam deploy --stack-name nealon-analytics-report
  --region ap-southeast-2 --profile personal --resolve-s3 --capabilities CAPABILITY_IAM
  --no-confirm-changeset --parameter-overrides FromEmail=<addr> ToEmail=<addr> ScheduleExpr='cron(...)'`
- **Send one now (test):** `aws lambda invoke --function-name <ReportFunction name>
  --region ap-southeast-2 --profile personal /tmp/out.json`
