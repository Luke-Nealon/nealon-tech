# nealon.tech — Claude working notes

Personal site for **Luke Nealon** (Sydney) — a React + Vite SPA on S3/CloudFront, plus a live
AI assistant (Lambda + Bedrock) and supporting AWS infra. It's his **personal brand and the
canonical home of his long-form writing** (own it here; syndicate short-form to LinkedIn).

## Read first
**`PROJECT_MEMORY.md` is the detailed source of truth — read it before substantial work.**
Other docs: `README.md` (static-site infra + deploy), `ANALYTICS.md` (CloudFront-log analytics +
daily digest), `WRITING-BACKLOG.md` (article ideas).

## Non-negotiable rules
- **No current-employer or client names anywhere on the site.** Anonymise (vendor/product names like
  AWS, Claude, SD-WAN are fine). Real career facts live at `~/dev/resume` — anonymise before use.
- **Plain voice, no jargon/buzzwords.** Approved exec framing: **"fluent from boardroom to codebase"**
  — do NOT say "still writes the code / still ships". No "open to roles" line (LinkedIn covers it).
- **Preview visual changes before deploy** — the site ships straight to prod and is QA'd closely.
- All visible copy lives in `src/content.js` (chrome) + `src/content/articles.js` (articles).
  Components hold no prose.

## Key commands
- **Dev:** `npm run dev` (Vite, port 5173).
- **Deploy:** `./deploy.sh` — builds, uploads to S3, invalidates CloudFront. Now auto-regenerates
  OG cards (`gen-og-images.mjs`) + SEO (`gen-seo.mjs`) first, so neither can go stale.
- **After adding/editing an article**, before deploy, also run (both call Bedrock → manual):
  - RAG ingest: `cd ai-backend/ingest && AWS_PROFILE=personal node ingest.mjs`
  - Knowledge map: `AWS_PROFILE=personal node scripts/gen-graph.mjs`

## Routes
`/` (home: bio + teaser, positions, writing, live demo), `/writing` + `/writing/<slug>`
(Perspectives), `/graph` (Knowledge map), `/about` (bio + full career timeline). SPA deep links
resolve via the CloudFront 403/404 → `index.html` fallback.
