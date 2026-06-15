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

A scheduled Lambda emails a plain-text traffic digest every day — no dashboard to log into.
SAM app in `analytics-report/` (stack `nealon-analytics-report`, ap-southeast-2, profile `personal`).

- **What it sends:** yesterday / 7-day / 30-day views + visitors, daily breakdown, top articles,
  top pages, referrers (sources), AI-crawler hits (GPTBot/ClaudeBot/Perplexity/etc.), and assistant
  usage (sessions/messages/tokens from `nealon-ai-guardrails`). Gracefully reports "no traffic yet".
- **Delivery:** SNS topic → email subscription. **Confirm the subscription once** (AWS sends a
  confirmation email on deploy). Recipient = `ReportEmail` param (default `luke@nealon.tech`).
- **Schedule:** `cron(0 22 * * ? *)` = 22:00 UTC ≈ 08:00 Sydney (AEST; 09:00 during AEDT).
- **No engagement/interaction time** — request logs can't see it (would need a cookieless client
  script like Plausible/Cloudflare; deliberately not added, to honour the privacy page).
- **Redeploy:** `cd analytics-report && sam build && sam deploy --stack-name nealon-analytics-report
  --region ap-southeast-2 --profile personal --resolve-s3 --capabilities CAPABILITY_IAM
  --no-confirm-changeset --parameter-overrides ReportEmail=<addr> ScheduleExpr='cron(...)'`
- **Send one now (test):** `aws lambda invoke --function-name <ReportFunction name>
  --region ap-southeast-2 --profile personal /tmp/out.json`
- Dependency-free (AWS SDK v3 from the nodejs20 runtime).
