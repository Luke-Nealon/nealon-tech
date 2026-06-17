# nealon.tech

Personal site for Luke Nealon. React + Vite, static output, no runtime dependencies
beyond React. All copy lives in `src/content.js`.

> **Working memory / setup source of truth:** [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) — AI
> assistant backend, RAG/ingest, SEO/OG pipeline, DNS/email, cost guardrails, and the hard-won
> gotchas. Read it first in a fresh session. (Analytics → `ANALYTICS.md`; article backlog →
> `WRITING-BACKLOG.md`.)

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
```

## Build

```sh
npm run build      # outputs static site to dist/
npm run preview    # serve the production build locally
```

## Deploy

```sh
./deploy.sh    # build → S3 → CloudFront invalidation → live at https://nealon.tech
```

Infrastructure (AWS account 389901108572, `personal` CLI profile, created 2026-06-13):

| Piece | Value |
|---|---|
| S3 bucket (private, OAC-only) | `nealon-tech-site-389901108572` (ap-southeast-2) |
| CloudFront distribution | `E2G1CF1OWQH84U` (aliases: nealon.tech, www.nealon.tech) |
| ACM cert (us-east-1) | `d8034fef-3bee-4aa8-a64d-22dd1681961e` |
| DNS | Route53 zone `Z1APPUETVY7T79` — A/AAAA aliases at apex + www |

Vite is configured with `base: './'` so the build works from the bucket root or any prefix.

## House rules

- No current-employer or client names anywhere on this site.
- Copy edits go in `src/content.js` — components don't contain prose.
