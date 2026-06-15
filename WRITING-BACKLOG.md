# Perspectives — writing backlog (nealon.tech/writing)

Articles live in `src/content/articles.js` (markdown body + `published` flag, `category`).
Categories match `CATEGORIES` in that file; the index is topic-keyed and shows them in that
order (exec-altitude themes first, AI & Automation as the deep bench).

**Voice:** Luke's — opinionated, plain, run through the `humanizer` skill before publishing.
Each piece makes an argument, not a summary. Ground claims in real experience. ~500–900 words.

**House rule:** no employer or client names on the site. Every topic below is tellable
anonymously — "a major SD-WAN platform", "a global call centre" — as the firsts ledger does.

**Cadence:** don't dump. Write one, ship it, space them out. Releasing across weeks is what
builds the honest "sustained thinking" signal (the index is year-only, so it won't broadcast
that a batch went out the same day). The Trend Radar tooling is meant to feed this queue.

**Priority:** fill **Operating Models & Efficiency** and **Leadership** first — biggest
perception gap (currently AI-heavy), strongest executive signal, and both double as Mulpha
interview material.

---

## Published (11), by category

**Technology Strategy** — Build for the model you'll want to replace · When the answer replaces the search box
**Operating Models & Efficiency** — Don't automate waste
**Security, Risk & Trust** — List every AI tool you depend on. Now find the backup.
**AI & Automation** — Most "agents" are workflows in disguise · The most powerful AI tool is already on your machine · Your agent harness should repair itself · It's maths, not magic (Part 1) · The maths learned to check its work (Part 2) · Applied AI: what to think about before you ship · No servers, AWS-grade uptime, cents a month
**Leadership & Operating Teams** — *(none yet — empty bucket, doesn't render on the index until written into)*

---

## Backlog by category

### Technology Strategy
- [ ] **Cloud bills are an architecture decision, not a finance problem** — the 80% AWS reduction via a database redesign. CFO-friendly.
- [ ] **The economics of technical debt** — when paying it down earns its return, when it doesn't.
- [ ] **Own the capability you can't afford to lose** — generalise model-independence into a build-vs-buy principle.
- [ ] **The technology side of M&A: integrating what you acquire** — back-office consolidation; scale without duplicated infrastructure. (Mulpha-relevant.)
- [ ] **Why most digital transformations fail** — grounded in real ERP / remote-pivot transformations.

### Operating Models & Efficiency  *(priority — thin)*
- [ ] **We tripled what we managed without adding headcount** — capacity as an architecture problem, not a hiring one.
- [ ] **Don't scale the org chart — scale the system** — de-duplication / shared services (the Mulpha consolidation argument).
- [ ] **Insourcing the night shift** — replacing outsourced after-hours work with L1 automation; the economics of automate-vs-outsource.
- [ ] **I measure technology by queues removed, not projects delivered.**

### Security, Risk & Trust
- [ ] **Compliance by design beats compliance by audit** — long-form version of the homepage field note.
- [ ] **If the data is never stored, nothing has to protect it** — data minimisation as architecture.
- [ ] **Security as a revenue enabler** — how identity / SSO unlocked an enterprise market. Security that makes money, not just spends it.
- [ ] **What a board should ask about cyber — and which answers should worry them.**

### AI & Automation  *(deep bench — top up, don't over-feed)*
- [ ] **AI strategy decks are not AI** — shipping vs planning (production AI while the industry wrote decks).
- [ ] **What a CFO should ask before funding an AI project** — the ROI / payback lens.
- [ ] **AI won't shrink your headcount — it'll change what your headcount does.** (augment-not-replace.)

### Leadership & Operating Teams  *(priority — empty)*
- [ ] **Running a team across four time zones without burning anyone out.**
- [ ] **Hiring for judgment when the technology changes every six months** — what you told Marcus on the call.
- [ ] **Decision-making under uncertainty.**
- [ ] **The 30-day pivot: leading delivery under a hard deadline** — the COVID PWA story as a leadership piece, not a tech one.
- [ ] **I build with the team, not above it** — the boardroom-to-codebase ethos as a leadership stance.

---

## Future enhancements
- **Per-article OG cards** — every link currently shares the default branded card (`public/og.png`)
  because the SPA serves one index.html for all routes. For per-article preview images/titles:
  prerender a static HTML per article with its own OG tags + a generated card image, and add a
  CloudFront Function to rewrite `/writing/<slug>` → `/writing/<slug>/index.html`. Bigger build;
  the shared card is fine for now.
- **Topic filter pills** — once a few categories have depth, add `All | <topic>` filter buttons
  above the ledger (search only worth it past ~30 articles).

## Provenance (first 11 — source material)
The opening batch grew from short videos/threads, reworked into Luke's POV and grounded in his
experience (Lean/Six Sigma, the 3× scale at flat headcount, ITIL/continuous improvement, the
live serverless RAG assistant). The model-independence pair deliberately frames concentration
risk as a hypothetical — *not* as any real-world event — to avoid reading as satire.
