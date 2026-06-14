# Writing backlog — nealon.tech/writing

Articles live in `src/content/articles.js` (markdown, `published` flag). Add an entry to publish.
Voice: Luke's — opinionated, plain, run through the `humanizer` skill before publishing. Each
should make an argument, not summarise a video. Ground claims in real experience where possible.

## Published
- ✅ **Build for the model you'll want to replace** — model-provider independence; ties to the
  live assistant's model switcher. (slug: model-provider-independence)
- ✅ **Most "agents" are workflows in disguise** — workflow vs agent decision + max-iteration
  discipline; diagram. (slug: workflow-or-agent)
- ✅ **Don't automate waste** — Lean/Six Sigma before automation; map → eliminate → standardise →
  automate → measure; diagram; cites the 3× scale at flat headcount. (slug: dont-automate-waste)

- ✅ **The most powerful AI tool is already on your machine** — skills over harnesses. (skills-over-harnesses)
- ✅ **List every AI tool you depend on** — dependency audit / continuity. (audit-your-ai-dependencies)
- ✅ **Your agent harness should repair itself** — self-healing loop. (self-healing-harness)
- ✅ **It's maths, not magic** — next-token prediction (Part 1). (its-maths-not-magic)
- ✅ **The maths learned to check its work** — reasoning models / test-time compute (Part 2). (the-maths-learned-to-check-its-work)
- ✅ **Applied AI: what to think about before you ship** — the hub linking all of the above. (applied-ai-field-guide)

→ All planned articles published (10 total). Next ideas welcome; add entries to articles.js.

## Future enhancements
- **Per-article OG cards** — currently every link shares the default branded card (public/og.png)
  because the SPA serves one index.html for all routes. For per-article preview images/titles:
  prerender a static HTML per article with its own og tags + a generated card image, and add a
  CloudFront Function to rewrite /writing/<slug> → /writing/<slug>/index.html. Bigger build;
  the shared card is fine for launch.

## Original drafts (now all written) — source material + angle

1. **Skills over harnesses: the most powerful AI tool is already on your machine**
   - Source: "the most powerful AI tool" video — Anthropic Agent Skills; instead of bespoke
     agents per workflow or a heavy LangGraph harness, organise instructions/data/tools as
     folders + markdown (skill.md / script.py); one capable agent reads them and spawns
     sub-agents on the fly.
   - Luke's angle: you don't need a sprawling agent framework. Structure beats infrastructure.
     Tie to how this very site/résumé project is run with Claude Code + skill files.

2. **You're renting the model, not owning it** (single-provider risk — companion to article 1)
   - Source: "government pulled Fable 5" video. ⚠️ DO NOT state the event as fact — it reads as
     satire/fiction. Frame as a hypothetical: "imagine the model you depend on vanished overnight."
   - Luke's angle: NOT about government/politics. About concentration risk — list your AI
     dependencies, have a backup for the critical one. Pairs with article 1 (independence is the
     fix). Could merge into article 1 or stand alone as the "why" to article 1's "how".

3. **Your agent harness should repair itself**
   - Source: Akshay / Opik thread — observability ends at the trace; the real loop is
     trace → diagnose → fix → verify → lock as regression test. Self-healing harness.
   - Luke's angle: the gap isn't observability, it's everything after the trace. What a mature
     AI ops practice looks like (evals as plain-English assertions, every failure becomes a test).
     Ties to his ITIL/continuous-improvement + the support-platform work.

4. **It's maths, not magic: what an LLM is actually doing**
   - Source: "how LLMs work" — tokenisation, next-token probability, no understanding/reasoning.
   - Luke's angle: why this matters for how you USE it — stop trusting it for memory/truth, write
     prompts that set better starting probabilities, don't be impressed by fluent output. The
     practitioner's mental model. Good "foundations" piece for a non-technical exec audience.

5. **Workflow or agent? Most "agents" are workflows in disguise**
   - Source: Parthknowsai "when to use a workflow vs an AI agent" — workflow = predefined steps;
     agent = LLM decides next step; use agents only when you can't predict the next step; always
     cap iterations; start with a workflow.
   - Luke's angle: his EXISTING field note ("most businesses need a workflow, not an AI wrapper")
     expanded into a full piece with the decision rule + the max-iteration discipline. Strongest
     overlap with his stated POV; high priority.

6. **(Hub) Applied AI: what a systems engineer should think about before shipping**
   - The landing/overview Luke described — the umbrella piece linking the others: model
     independence, workflow-vs-agent, cost control, compliance by design, self-healing harness,
     the LLM mental model. Could double as the /writing intro.

## Notes
- Article 5 (workflow vs agent) and the hub (6) are highest priority — they directly extend
  Luke's signature POV and the Mulpha pitch.
- Keep each ~500–900 words, one clear argument, his voice, humanizer pass before publish.
