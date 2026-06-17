# nealon.tech — Working Memory

> In-repo source of truth for the site, the AI assistant, and the supporting AWS infra.
> Consolidated from the assistant's cross-session memory on 2026-06-17 so a fresh Claude
> session opened **in this repo** has the full picture. Read this first.
>
> **Don't duplicate:** static-site infra + deploy live in [`README.md`](README.md); analytics +
> daily email digest live in [`ANALYTICS.md`](ANALYTICS.md); article backlog in
> [`WRITING-BACKLOG.md`](WRITING-BACKLOG.md). This file covers everything else.

## Purpose & house rules
- Personal site for Luke Nealon, positioning him as a senior technology exec (CIO-level) — a
  tangible proof point for job applications (active: **Mulpha GM Technology, Data & AI**).
- **No current-employer or client names anywhere on the site.** The AI assistant is a clean-room
  showcase of an applied-AI *pattern*, NOT the real Coevolve IP.
- All visible copy lives in `src/content.js` (site chrome) and `src/content/articles.js` (articles).
  Components don't contain prose.
- **Framing rule (Luke):** do NOT say "still writes the code" / "still ships". The scarce exec
  skill is the *judgment* to read, direct and verify what's built. Approved phrasing:
  **"fluent from boardroom to codebase."**

## AWS account & profile (one place)
- Account **389901108572**, AWS CLI profile **`personal`**, region **ap-southeast-2** (except ACM
  cert which must be us-east-1). Every command below assumes `--profile personal`.
- Static-site infra (S3/CloudFront/ACM/Route53 IDs) → see the table in `README.md`.

## DNS & email (Route53 zone `Z1APPUETVY7T79`)
- Same zone also hosts **flooring.nealon.tech** and others — **do NOT touch the apex MX records,
  they're Google Workspace email.**
- Primary contact email is **luke@nealon.tech** (Google Workspace). Gmail is fallback.
- Apex **SPF + DMARC (p=none)** added 2026-06-13. **DKIM is a pending Luke action** in the Google
  Admin console — not a repo change.
- SES domain identity `nealon.tech` is verified (Easy DKIM) — used by the analytics digest and
  any future transactional mail; covers `@nealon.tech` recipients in the SES sandbox (no
  production-access request needed).

## AI assistant (`src/Assistant.jsx` + `ai-backend/`)
Live scoped chat demo: static React → **AWS Lambda Function URL** → **Bedrock Converse API**
(model-independent) → Claude / Nova / Qwen. Showcases the applied-AI pattern + RAG.

- **Backend:** SAM app in `ai-backend/` (`template.yaml`, `src/handler.mjs`), stack
  **`nealon-ai-assistant`**, ap-southeast-2, profile `personal`. Runtime nodejs20.x; **esbuild must
  be installed globally** for `sam build`.
- **Function URL:**
  `https://6xfeceqcoli6rmkxmcghytx5eq0lpqux.lambda-url.ap-southeast-2.on.aws/`
- **Redeploy backend:**
  ```sh
  cd ai-backend && sam build && sam deploy --stack-name nealon-ai-assistant \
    --region ap-southeast-2 --profile personal --resolve-s3 \
    --capabilities CAPABILITY_IAM --no-confirm-changeset
  ```
  Frontend redeploy is just `./deploy.sh` (see README).
- **Guardrails** (DynamoDB table **`nealon-ai-guardrails`**): per-session rate limit (12/day) +
  a hard **$5/day budget kill-switch** (key `budget#<date>` — also the cheapest proxy for
  assistant activity in analytics). A consent/GDPR gate precedes chat = "compliance by design".
- **Models (as of 2026-06-14):** **Claude Haiku 4.5 (default)** + Claude Sonnet 4.6 + Amazon Nova
  Lite + Qwen3 Coder (Alibaba) — 3 vendors, one Converse code path (the model-independence demo).
- **Streaming:** ConverseStream + Lambda RESPONSE_STREAM (needs IAM
  `bedrock:InvokeModelWithResponseStream`). Markdown rendering, fullscreen toggle, privacy reset +
  `/privacy.html`, Mermaid diagram rendering, and a markdown-download button are all done.

### Bedrock GOTCHAS (hard-won — don't relearn these)
- **Newer Claude on Bedrock needs cross-region inference-profile IDs** (`au.anthropic...`), NOT raw
  model IDs. Qwen works with a **direct** model id `qwen.qwen3-coder-30b-a3b-v1:0` (no profile).
- **Anthropic use-case form** (gates Claude access): submit via **CLI**, no console —
  `aws bedrock put-use-case-for-model-access --form-data fileb://form.json` where form.json =
  `{companyName, companyWebsite, intendedUsers, industryOption, otherIndustryOption, useCases}`.
  Propagates in minutes. Until granted, the default falls back to **Nova**.
- **Opus 4.8/4.7 = AccessDenied** on this account (needs an AWS Sales request; also too pricey for a
  public capped endpoint). **Llama = not offered in ap-southeast-2.** Nova follows the
  diagram/system instructions loosely; **Claude follows them reliably** (reason the default is Haiku).

## RAG over the articles (`ai-backend/ingest/`)
The assistant does retrieval-augmented generation over Luke's published articles (mirrors his
Coevolve RAG pattern). Scope = "AI topics Luke has written about + the assistant's own architecture".

- **Store:** S3 Vectors index **`nealon-vectors/articles`** (ap-southeast-2), 1024-dim cosine,
  **Titan v2 embeddings** (`amazon.titan-embed-text-v2:0`).
- **Flow:** Lambda embeds the query → QueryVectors topK 5 → grounds the answer in the excerpts
  (in Luke's voice) → streams a trailing `<<SOURCES>>` + JSON marker the frontend renders as
  linked source chips to `/writing/<slug>`.
- **⚠️ After adding/editing any article, re-run the ingest to refresh the index:**
  ```sh
  cd ai-backend/ingest && AWS_PROFILE=personal node ingest.mjs
  ```
  (Then redeploy the handler only if `handler.mjs` changed.) Current index ≈ **74 chunks from 15
  articles** (2026-06-17).

## /writing (Perspectives) section
- Articles live in **`src/content/articles.js`** (append an entry, set `published: true`). Rendered
  by `src/Writing.jsx` (marked + a tiny History-API router in `App.jsx`; CloudFront SPA fallback
  serves deep links). Nav label is **"Perspectives"** but the URL/section stays **`/writing`**.
- Articles support **```mermaid** diagrams and markdown tables. The section has search + filter
  pills (keyed by article `category`), a "Start here" featured row, and a related-articles footer.
- **To add an article:** edit `src/content/articles.js` → `./deploy.sh` → re-run the ingest (above).
- Long-form flagships follow the **Lean article standard**: ~1.2–1.5k words, 3–4 native visuals
  (Mermaid + HTML/CSS), **no generative image models**.

## /graph (knowledge graph)
- Interactive node-link map of all published articles at **`/graph`** (nav label "Map"),
  rendered natively with **cytoscape** (lazy-loaded chunk + `cytoscape-fcose` layout; themed off
  the live CSS vars — the single `control` brand palette). Layout is deterministic (fcose
  `randomize:false` refining a circle seed) and stretches to the canvas aspect so it fills the
  width. Nodes link to `/writing/<slug>`; hover isolates a node's
  neighbourhood. Component `src/Graph.jsx`, route + "Map" nav in `src/App.jsx`, `.graph-*`
  styles in `src/styles.css`.
- **Data:** `scripts/gen-graph.mjs` generates `public/graph.json` — nodes = published articles;
  edges = authored cross-links **+** top-3 **Titan-embedding** semantic neighbours (the SAME
  embeddings as the RAG assistant), with an isolated-node rescue so nothing floats. Run **on
  demand** (it calls Bedrock), NOT in the build: `AWS_PROFILE=personal node scripts/gen-graph.mjs`
  — **re-run after adding/editing articles** (alongside the RAG ingest), then `./deploy.sh`
  (ships `graph.json` no-cache + invalidates `/graph` + `/graph.json`).
- The bare `/graph` route resolves via the CloudFront **403/404 → /index.html** SPA fallback
  (no prerender needed). Deps added: `cytoscape` (runtime), `@aws-sdk/client-bedrock-runtime`
  (build tooling, like satori).

## Theme — single `control` brand palette (terminal removed 2026-06-17)
The site is **one theme**: `control` (cold graphite + signal mint, Schibsted Grotesk), defined in
`:root` in `src/styles.css`. The old `terminal` theme + the theme switcher + CRT atmosphere (`.fx*`)
+ Chakra Petch font were removed; there is no `data-theme` attribute or toggle anymore. Components
still read colours from the live CSS vars (theme-agnostic), so re-introducing themes later is easy.

## Mermaid theming (`src/Mermaid.jsx`)
One shared component themes ALL article diagrams + chat diagrams. Uses mermaid `theme:'base'` with
themeVariables computed from the live CSS vars (the single `control` palette). Per-node hues from an
analogous palette.
- **GOTCHA — do NOT revert:** the per-node recolour (`colourize()`) MUST use lenient HTML parsing
  (`div.innerHTML = svg` → manipulate → `root.outerHTML`). An earlier strict
  `DOMParser('image/svg+xml')` + XMLSerializer version choked on non-strict-XML SVGs and rendered a
  red "This page contains the following errors" box.

## SEO / crawler / OG cards
- `scripts/gen-seo.mjs` generates `sitemap.xml` + `llms.txt` — **re-run after adding articles.**
  (It does NOT touch `robots.txt` — that's a hand-maintained static file.) Per-page
  `document.title` set client-side.
- **Crawler policy (2026-06-17):** stance = **allow AI search/retrieval crawlers that cite & link
  back, opt out of bulk AI *training* crawlers.** `public/robots.txt` (static, shipped by
  `deploy.sh`) carries the polite rules. Allowed incl. OAI-SearchBot, Claude-SearchBot/Claude-User,
  ChatGPT-User, Perplexity(-User), Amzn-SearchBot/Amzn-User, MistralAI-*, meta-externalfetcher,
  YouBot, DuckAssistBot, classic search, and **Google-Extended (deliberately allowed — keeps us
  citable in Gemini; Google bundles training+grounding under one token, can't split).** Blocked
  (training): GPTBot, ClaudeBot, Applebot-Extended, CCBot, Amazonbot, meta-externalagent,
  Bytespider, cohere-training-data-crawler, AI2Bot, Webzio-Extended, omgilibot, PanguBot, GrokBot.
- **Edge enforcement (no WAF, on cost grounds):** the `nealon-writing-rewrite` CloudFront Function
  (`infra/cf-writing-rewrite.js`) also **403s honest-UA training crawlers** — list mirrors the
  robots.txt Disallow set MINUS the control-only tokens (Applebot-Extended, Google-Extended) which
  never send requests. Spoofed browser-UA crawlers (Bytespider/Grok stealth) are NOT caught — that
  needs WAF ASN/IP rules (~$6–7/mo); accepted trade-off. **Deploy the function:**
  `bash infra/deploy-cf-function.sh` (updates DEVELOPMENT → publishes LIVE; the dist association
  points at LIVE so it propagates — no `update-distribution`). Keep the function's block list and
  robots.txt Disallow set in sync.
- **Per-article OG meta:** `scripts/prerender-og.mjs` runs as part of `npm run build` (after
  `vite build`): clones `dist/index.html` into `dist/writing/<slug>.html` (+ `dist/writing.html`)
  with article-specific title/description/og:*/twitter:*/canonical/published_time. A **CloudFront
  Function** `nealon-writing-rewrite` (viewer-request; code in `infra/cf-writing-rewrite.js`,
  associated on dist `E2G1CF1OWQH84U`) rewrites `/writing/<slug>` → `.html` so JS-less crawlers get
  per-article meta while the SPA still hydrates. `deploy.sh` uploads `writing*.html` no-cache.
  - **GOTCHA** in `prerender-og.mjs` `setMeta`: match the FULL `property="og:image"` (with quotes)
    or it also clobbers `og:image:width/height`.
- **Per-article OG images:** `scripts/gen-og-images.mjs` (run **on-demand**, NOT in build:
  `node scripts/gen-og-images.mjs`) uses **satori + @resvg/resvg-js** to render branded 1200×630
  PNGs → `public/og/<slug>.png`.
  - **Font GOTCHA:** use the **static** Schibsted Grotesk 600 `.woff` from Fontsource in
    `scripts/fonts/` — the Google *variable*-font TTF crashes satori's opentype fork on the fvar
    table. IBM Plex Mono static TTFs are fine.
- **Verify like a crawler:** `curl -s https://nealon.tech/writing/<slug> | grep og:`. LinkedIn
  caches OG — use its Post Inspector to force a re-scrape.

## Cost guardrails (added 2026-06-17)
- **AWS Budgets** `nealon-monthly-cost` = **$15/mo** (alerts at 80% / 100% + forecast).
- **Cost Anomaly Detection** `nealon-anomaly-email` = DAILY email if a day's spend exceeds expected
  by ≥ $5 (EMAIL delivery needs DAILY/WEEKLY freq; IMMEDIATE would require SNS).
- Account baseline ≈ **$6.6/mo**. Both guardrails are free.

## Privacy stance
- **No analytics scripts, no tracking cookies** — deliberate, to honour `/privacy.html`. All traffic
  insight comes server-side from CloudFront logs via Athena (see `ANALYTICS.md`). No engagement /
  time-on-page metric (would need a client script — not added on purpose).
