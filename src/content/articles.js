// Writing — articles for nealon.tech/writing.
// Each entry: { slug, title, category, dek, date (ISO), readMins, published, body (markdown) }.
//   category — must be one of CATEGORIES (below); drives the topic-keyed index.
//   updated  — optional ISO date; when set, the index shows "Updated <year>" instead of the year.
//   featured — optional number; sets the "Start here" row at the top of the index (lower = first).
// Add an article = add an entry. published:false keeps it off the index.

export const articles = [
  {
    slug: 'model-provider-independence',
    category: 'Technology Strategy',
    featured: 3,
    title: 'Build for the model you’ll want to replace',
    dek: 'Why the assistant on this site swaps between Claude and Nova on a dropdown — and why model independence is a board-level decision, not a developer preference.',
    date: '2026-06-14',
    updated: '2026-06-17',
    readMins: 6,
    published: true,
    body: `The assistant on this site has a dropdown. You can switch it between Claude Haiku, Claude Sonnet, and Amazon Nova in the middle of a conversation, and the answers keep coming. That isn't a party trick. It's the whole point.

Most teams building with AI right now are quietly making a decision they haven't named. They're betting the business on one model from one provider. The prompts are tuned to that model, the code calls that provider's API, the features lean on that provider's quirks. It works, it ships, everyone's happy. Then one day it isn't your decision anymore.

Prices change. Rate limits tighten. A model you depend on gets deprecated with a few months' notice. A better one launches somewhere else and you can't reach it without a rewrite. Or the model simply goes away, and your product goes with it. If your whole operation runs on one model from one company, you don't own that capability. You're renting it, and somebody else holds the lease.

So I treat the model as a component, not a foundation. The application talks to one interface; the model behind it is swappable.

\`\`\`mermaid
flowchart LR
  A["Your application"] --> B["Model interface
(your abstraction)"]
  B --> C["Claude"]
  B --> D["Amazon Nova"]
  B --> E["Next model
(whatever ships)"]
\`\`\`

## What that looks like in practice

Put an abstraction between your application and the model. On this site I use Amazon Bedrock's Converse API, where Claude and Nova both run through one identical code path, so switching is a one-line change rather than a project. You don't have to use Bedrock. The principle is what matters: wrap the model behind your own interface, keep your prompts and your evals in your codebase instead of scattered through provider-specific calls, and the model becomes something you choose, and can re-choose, rather than something you're stuck with.

## Independence isn't free

Pretending it is gets you burned the other way. The moment you abstract across providers, you're writing to the lowest common denominator. The clever provider-specific feature, the caching trick, the structured-output mode, the long-context behaviour, might be exactly what makes your product good. Sometimes the right call is to use it and accept the lock-in with your eyes open, because the value is worth the dependency. The wrong move is doing it by accident and discovering how deep the coupling goes only when you try to leave.

Here's the test I apply. If this provider doubled its price or disappeared tomorrow, how long would it take to switch? If the answer is "an afternoon," you built it right. If the answer is "we can't," you'd better be getting enormous value in return, and you'd better have decided that on purpose.

## When to rent, and when to lock in

So the real decision isn't "abstract everything". It's knowing which parts to keep portable and which are worth marrying. The test is whether the model is the source of your edge.

\`\`\`mermaid
flowchart TD
  Q{"Is this model the source of your edge?"}
  Q -->|commodity step| P["Abstract it — stay portable, re-choose any time"]
  Q -->|your actual edge| L["Lock in on purpose — take the dependency with eyes open"]
\`\`\`

For the commodity work, which is most of it — summarising, classifying, drafting — keep the model swappable and let price and quality compete for your traffic. For the one capability where a specific model's behaviour genuinely is the product, use it fully and accept the lock-in, because the value is worth the dependency. What you never want is to drift into deep coupling by accident, on the boring parts, and discover it only when you try to leave.

A simple way to keep yourself honest: for each model dependency, write down what you'd do if that provider doubled its price or disappeared tomorrow. If the answer is "swap it in an afternoon," you built it right. If it's "we can't," that had better be a capability you chose to depend on, not one you backed into.

## Why it's a board-level question

The person who picks the model is making a procurement and risk decision, whether they frame it that way or not. Single-supplier dependence on the most strategically important new capability in a generation is exactly the kind of thing a CIO should have a view on, not something that gets decided by whichever SDK a developer reached for first.

Own the capability. Rent the model. Keep the receipt so you can hand it back.`,
  },

  {
    slug: 'workflow-or-agent',
    category: 'AI & Automation',
    title: 'Most “agents” are workflows in disguise',
    dek: 'When an autonomous agent earns its place, when a plain workflow is the better engineering choice, and why most teams get the order backwards.',
    date: '2026-06-14',
    readMins: 4,
    published: true,
    body: `Most of what gets shipped as an "AI agent" today is a workflow wearing a costume.

Here is the distinction that matters. A workflow is a system where you decide the steps in advance. A ticket comes in, you classify it, you route it to the right team. You wrote every one of those steps. An agent is different: you hand a model a goal and some tools, and it decides what to do next on its own. Pull up the account, work out what broke, decide whether to refund or escalate. The model is making the call, not you.

Both are legitimate. The mistake is reaching for the second when you needed the first.

\`\`\`mermaid
flowchart TB
  subgraph WF["Workflow — you define every step"]
    direction LR
    W1["Input"] --> W2["Classify"] --> W3["Route"] --> W4["Done"]
  end
  subgraph AG["Agent — the model decides each step"]
    direction LR
    A1["Goal + tools"] --> A2{"Model picks next action"}
    A2 --> A3["Tool runs"]
    A3 --> A2
    A2 -->|done or max iterations| A4["Done"]
  end
\`\`\`

Agents are the thing everyone wants to build right now, so engineers jump straight to them. But an agent is the more expensive option in every dimension that counts. It is slower, because it loops. It costs more, because every loop is more model calls. It is harder to debug, because the path changes from one run to the next. And it is less predictable, which is the opposite of what you usually want in production.

A workflow is cheap, fast, and testable. You can write an assertion for every branch. You know what it will do before it does it.

## So when does an agent earn its place?

When you genuinely cannot predict the next step in advance. The clean example is research. An agent reads a page, and what it finds determines what it looks up next. You could not have written those steps ahead of time, because they depend on information that did not exist until the previous step ran.

That is the test. If you can draw the flowchart, build the flowchart. If the flowchart can only be drawn at runtime, you might need an agent.

And if you do build one, two rules. Give it a tight set of tools, not the keys to everything. And cap the iterations, always, so a confused agent stops instead of spiralling through your token budget at three in the morning.

## Start with the spine

The pattern I follow: start with a workflow, and add autonomy only at the specific points where predictability genuinely breaks down. Most systems want a deterministic spine with one or two agentic joints, not an agent for the whole body.

This is the same principle as knowing where AI belongs at all. Autonomy is a cost you pay for flexibility you actually need. If you do not need the flexibility, you are just paying the cost and calling it innovation.`,
  },

  {
    slug: 'dont-automate-waste',
    category: 'Operating Models & Efficiency',
    featured: 2,
    title: 'Don’t automate waste',
    dek: 'The most expensive automation is the one that makes a broken process run faster. Why a waste analysis, not a technology wishlist, should decide what you automate.',
    date: '2026-06-14',
    readMins: 4,
    published: true,
    body: `The most expensive automation I have seen is the one that takes a wasteful process and makes it run faster. Now the waste is automated. It is harder to see, harder to question, and you have spent money cementing it in place.

This is the trap with AI and automation right now. The technology is exciting, so teams go looking for things to automate. They pick the steps that hurt the most and make them faster. What they skip is the question that should come first: should this step exist at all?

I came up through [Lean and Six Sigma](/writing/how-lean-actually-works) before I came up through automation, and the order those disciplines teach is the order that works. Before you make a process faster, you map it and you find the waste. The steps that exist only because of a decision nobody remembers. The handoffs that add a day and no value. The rework caused by a defect three steps upstream. The reports nobody reads. Most processes are full of this, and none of it should be automated. It should be deleted.

\`\`\`mermaid
flowchart LR
  M["Map the process"] --> E["Eliminate the waste"]
  E --> S["Standardise what's left"]
  S --> A["Automate the valuable steps"]
  A --> R["Measure the result"]
\`\`\`

Only once you have stripped a process back to the steps that genuinely create value do you ask what to automate. By then the answer is usually smaller, cheaper, and far more valuable than the one you started with, because you are automating the work that matters instead of the work that was always waste.

I have watched this play out. Applying lean waste-reduction to a support operation, then automating what remained, let us triple the volume under management without adding headcount. The automation got the attention. The waste analysis is what made it worth building. Automating the original process would have locked in every inefficiency, at scale.

## The CIO version of this

Your automation budget should follow a waste analysis, not a technology wishlist. "Where can we use AI" is the wrong opening question. "Where is the waste, and which of it is worth automating once the rest is gone" is the right one. The first question buys you tools. The second buys you outcomes.

So before the model, before the pipeline, before the agent: walk the process and ask what should not be there. Automation makes things faster. Lean makes sure they are worth doing first.`,
  },

  {
    slug: 'skills-over-harnesses',
    category: 'AI & Automation',
    title: 'The most powerful AI tool is already on your machine',
    dek: 'You don’t need a sprawling agent framework. Structure beats infrastructure: folders, markdown, and one capable agent that reads them.',
    date: '2026-06-14',
    readMins: 4,
    published: true,
    body: `There's a problem every company hits when it tries to put AI to work. Call it the context wall. You have a capable model, but it needs your instructions, your data, and your tools, organised well enough that it does the right thing and doesn't make a mess. How you get information across that wall is the whole game.

The popular answer is to build infrastructure. A separate bespoke agent for every workflow. A heavy orchestration framework wired together with glue code. Soon you have a zoo of agents, each one a small software project to maintain, and a framework you now depend on.

There's a lighter answer, and it's the one I keep coming back to. Put the instructions, data, and tools into plain folders and markdown files. A task becomes a short markdown file describing how to do it, next to a script if it needs one. Then one capable agent reads the right file when a task comes up and effectively becomes the specialist for that job, on the fly.

\`\`\`mermaid
flowchart TD
  A["One capable agent"] --> S1["skill: write cover letter"]
  A --> S2["skill: humanise text"]
  A --> S3["skill: build the PDF"]
  A --> S4["skill: ...add a file to add a capability"]
\`\`\`

Why this wins: there's almost nothing to maintain, it's transparent because you can read a markdown file and know exactly what the agent will do, it versions in git like any other code, and you aren't locked into a framework. Adding a capability is adding a file, not shipping a service.

I'm not speaking theoretically. This site, my résumé, and the job applications behind them are run exactly this way: one agent and a small library of skill files, each a few paragraphs of markdown. When I needed a tailored cover-letter generator, I didn't build an app. I wrote a skill file describing how I want cover letters written, and the agent does the rest. The capability took minutes, and I can read and change it in a text editor.

The lesson for an organisation is a question to ask before you buy an agent platform: would structured files and one good agent do the job? Most of the time, they would. The instinct to reach for heavy infrastructure is usually the instinct to solve an organisation problem with a software purchase. Structure your knowledge well and the powerful tool you needed turns out to be the one already sitting on your machine.`,
  },

  {
    slug: 'audit-your-ai-dependencies',
    category: 'Security, Risk & Trust',
    title: 'List every AI tool you depend on. Now find the backup.',
    dek: 'Model independence is the architecture. This is the ten-minute business-continuity exercise behind it.',
    date: '2026-06-14',
    readMins: 3,
    published: true,
    body: `Imagine the model your product runs on is gone tomorrow. Not throttled. Gone. Deprecated with short notice, priced out of reach, or pulled while you weren't looking. If your business stops when that happens, you don't own the business. You're renting it, and someone else holds the switch.

I've written about [building for model independence](/writing/model-provider-independence) as an architecture problem. This is the business-continuity exercise that sits behind it, and it takes about ten minutes.

It isn't only the model. The dependency you can't see is usually the one that hurts. List all of it:

| Dependency | What if it doubles in price or disappears? | Backup / exit |
|---|---|---|
| The model | Rewrite, or switch via an abstraction | Second model behind the same interface |
| The provider | Outage takes you down with it | Multi-provider or fallback |
| The agent framework | Lock-in to someone's roadmap | Keep logic portable |
| The vector store / data layer | Re-index, re-ingest | Exportable data |
| The one person who understands it | Bus factor of one | Documentation, shared ownership |

For each row, ask the same question: what happens if this disappears, and how long until we recover? For the most critical one, make sure the answer isn't "we can't." Establish at least one backup or a real exit path.

None of this is exotic. We already do it everywhere else that matters. We run across cloud regions. We keep a second payment provider. We don't sign a single-carrier contract for the whole business. AI shouldn't get an exemption just because it's new and exciting. Concentration risk on your most strategically important capability is exactly the kind of thing that belongs on a risk register, not in a developer's head.

Ten minutes of listing dependencies, and one backup for the critical one, is the difference between a bad week and your operations going dark. Do it before something else decides to do it for you.`,
  },

  {
    slug: 'self-healing-harness',
    category: 'AI & Automation',
    title: 'Your agent harness should repair itself',
    dek: 'Observability tells you what happened. The expensive part is everything after the trace — and a mature practice closes that loop automatically.',
    date: '2026-06-14',
    readMins: 4,
    published: true,
    body: `When an AI agent fails in production, your observability tool shows you exactly what it did and almost nothing about how to fix it. You get a clean trace: every model call, every tool, how long each step took, what it cost. What you don't get is why it broke, the change that would fix it, or any promise it won't happen again next week.

So you scroll the trace, form a theory, write a patch by hand, and hope it doesn't break something that was working. Then a new model ships with a fresh set of failure modes, and you run the whole manual loop again.

The bottleneck isn't observability. It's everything that happens after the trace lands on your screen, and that's where production debugging actually lives.

\`\`\`mermaid
flowchart LR
  T["Trace a failure"] --> D["Diagnose the root cause"]
  D --> F["Propose a fix"]
  F --> V["Apply + verify against the original input"]
  V --> L["Lock it as a regression test"]
  L --> T
\`\`\`

The problem compounds. Every model upgrade introduces new failure modes. Every new tool adds edge cases. The harness, the layer of prompts, tools, and checks wrapped around the raw model, gets more complex faster than any team can track and repair by hand.

The fix is to treat the loop as something you automate, not something you staff. A failure should flow from trace to root cause to a proposed change, get verified against the exact input that broke it, and then be locked in as a regression test so the same thing can't come back. Every failure you debug becomes a permanent test. Every cycle, the harness gets harder to break.

Two things make this work in practice. Write your evals as plain-English assertions ("the response must never reveal unauthorised information"), not float comparisons on a labelled dataset, because that's how engineers actually think about quality. And keep a sandbox where you can run the whole agent against real inputs before a change ships, not just a prompt playground that tests one call.

If this sounds familiar, it's because it's old discipline in new clothes. It's problem management and continuous improvement: don't just fix the incident, fix it so it can't recur, and make the system a little more robust each time. I spent years applying that flywheel to managed-service operations long before agents existed. The technology is new. The discipline isn't.

The CIO version: when you run agents in production, budget for the loop after the trace, not just the dashboard that shows you the trace. The teams that win automate the repair, not only the observation.`,
  },

  {
    slug: 'its-maths-not-magic',
    category: 'AI & Automation',
    title: 'It’s maths, not magic: what an LLM is actually doing',
    dek: 'No understanding, no thinking — just very powerful next-token prediction. Once you see that, you use it far better.',
    date: '2026-06-14',
    readMins: 4,
    published: true,
    body: `Most people picture an AI model as a black box that understands your question, thinks about it, and answers. That isn't what happens. There's no understanding and no thinking. There's a very sophisticated maths problem, and it helps to know the shape of it.

Here's the whole thing. You type a message. Before it reaches the model, an application layer attaches a hidden system prompt, a set of instructions the company wrote. Your words plus those instructions get broken into tokens, and every token is a number. That string of numbers goes into the model, whose one job is to calculate which number is most likely to come next. It picks one, adds it, and calculates the next, and the next. Each number becomes a token, each token becomes text, and that text is the answer you read.

\`\`\`mermaid
flowchart LR
  I["Your message + system prompt"] --> T["Tokenise (text → numbers)"]
  T --> P{"Predict the most likely next token"}
  P --> P
  P --> O["Detokenise (numbers → text)"]
\`\`\`

That's it. It isn't reasoning. It's predicting the next token based on probability. Very powerful, but prediction.

Once that clicks, three things change about how you use it.

You stop trusting it for the things it genuinely can't do. It doesn't remember, and it doesn't know what's true. It produces what's plausible, which is often correct and occasionally confidently wrong. Anywhere truth matters, you add verification rather than faith.

You write better prompts. Instead of asking it questions like it's a person, you give it a strong start, because you're setting the starting probabilities for what comes next. Good context in, better continuation out.

And you stop being impressed by output that merely sounds smart. Sounding smart is precisely what the maths is optimised to do. Fluent and correct are different things, and the model is only guaranteed to give you the first.

None of this is deflating. It's clarifying. Knowing it's prediction tells you exactly where to lean on it and where to put guardrails. It's brilliant at drafting, transforming, summarising, and finding patterns in more text than a person could read. It's unreliable as a source of truth or memory. That single distinction is the whole reason I keep saying AI should be used where it earns its place: deploy it where plausible-and-fluent is enough, and add scaffolding wherever being right actually counts.

It's maths. Very, very powerful maths. Treat it like that and you'll get far more out of it than the people still waiting for it to think.

That's part one: the mechanism. But if you've used the newer models and felt them get genuinely better at hard problems, something did change. The maths learned to check its own work before it answers, and that quiet shift is behind most of the recent leap. → [Part two](/writing/the-maths-learned-to-check-its-work)`,
  },

  {
    slug: 'the-maths-learned-to-check-its-work',
    category: 'AI & Automation',
    title: 'The maths learned to check its work',
    dek: 'Part two. Reasoning models still don’t think — but they predict their way through the working, and weigh it, before they answer. That shift is most of the recent leap.',
    date: '2026-06-15',
    readMins: 4,
    published: true,
    body: `In [part one](/writing/its-maths-not-magic) I argued that a language model isn't thinking. It predicts the next token, over and over, and the fluent answer is the by-product. That's still true at the level of the mechanism. But if you've used the newer models and felt them get genuinely better at hard problems, something did change, and it's worth understanding, because it changes how you should use them.

The older models predicted the answer directly. You asked, they produced the most likely response in one pass. Fast, and fine for most things, but the model committed to a direction immediately with no chance to catch itself.

The newer reasoning models do something different first. Before they answer, they predict a long chain of intermediate steps: working through the problem, laying out options, weighing one stance against another, noticing where an earlier step went wrong and correcting it. Only after that working do they commit to a final answer. The industry calls it test-time compute, which is a dry name for a simple idea. Let the model do more work at the moment of answering, on the problems that are worth it.

\`\`\`mermaid
flowchart TB
  subgraph A["Older: answer in one pass"]
    direction LR
    O1["Question"] --> O2["Predict the answer"] --> O3["Answer"]
  end
  subgraph B["Newer: work first, then answer"]
    direction LR
    R1["Question"] --> R2["Predict the working: options, checks, corrections"]
    R2 --> R2
    R2 --> R3["Commit to an answer"]
  end
\`\`\`

Here's the part that matters. This is still prediction. The model isn't understanding the problem any more than it did before. But predicting your way through a worked solution, then predicting a critique of that solution, turns out to produce far better answers on hard problems than predicting the answer in one shot. It's the difference between blurting the first thing that comes to mind and thinking out loud, checking yourself as you go. Same machinery, much better results, because of the process.

That process is most of the recent leap in capability. Not a new kind of mind. The same next-token maths, pointed at its own working.

## What it means for how you use them

Match the model to the job. Reasoning models are slower and cost more, because all that intermediate working is more tokens. Use them where the problem is genuinely hard and multi-step: maths, code, planning, anything with a chain of dependent decisions. For simple or high-volume tasks a fast model is the right call, and paying for reasoning you don't need is just latency and cost with nothing to show for it.

And the part-one warning still holds. The reasoning is generated text, not a guarantee. A model can produce a long, confident, well-argued chain that lands in the wrong place. The working makes it more likely to be right, not certain to be. Where truth matters, you still verify.

So: it's maths. Then we got the maths to check its own work, and that quiet change is behind most of what feels like a step up in intelligence. Knowing the difference is how you decide which model to reach for, and when the extra thinking is worth paying for.`,
  },

  {
    slug: 'applied-ai-field-guide',
    category: 'AI & Automation',
    title: 'Applied AI: what to think about before you ship',
    dek: 'A short field guide for developers and systems engineers putting AI into real products — the questions I’d want answered before anything goes live.',
    date: '2026-06-15',
    readMins: 3,
    published: true,
    body: `AI is easy to demo and hard to ship well. A prototype that dazzles in a meeting is a different thing from a system you'd put in front of customers, on a budget, with your name on it. Over building a fair bit of the second kind, I've ended up with a short list of questions I ask before anything goes live. Each one has a longer piece behind it.

\`\`\`mermaid
flowchart TD
  S["Shipping AI into a real product?"]
  S --> Q1["Does it need AI at all?"]
  S --> Q2["Is the process worth automating?"]
  S --> Q3["Own the model, or rent it?"]
  S --> Q4["Do you know your dependencies?"]
  S --> Q5["What happens when it fails?"]
  S --> Q6["Do you know what it actually is?"]
  S --> Q7["Compliance built in, or bolted on?"]
\`\`\`

**Does it even need AI?** Most things shipped as "agents" are workflows in disguise. If you can draw the flowchart, build the flowchart. Use autonomy only where you genuinely can't predict the next step. → [Most "agents" are workflows in disguise](/writing/workflow-or-agent)

**Is the process worth automating at all?** The most expensive automation makes a broken process run faster. Find and cut the waste first, then automate what's left. → [Don't automate waste](/writing/dont-automate-waste)

**Do you own the capability, or rent it?** Put an abstraction between your application and the model so it's a swappable component, not a foundation. → [Build for the model you'll want to replace](/writing/model-provider-independence)

**Do you know your dependencies?** List every AI tool you rely on and make sure the critical one has a backup. Ten minutes now, or a dark day later. → [List every AI tool you depend on](/writing/audit-your-ai-dependencies)

**What happens when it fails?** It will. A mature practice closes the loop from failure to fix to regression test automatically, instead of debugging by hand forever. → [Your agent harness should repair itself](/writing/self-healing-harness)

**Do you know what it actually is?** It predicts the next token. It doesn't understand or remember. Knowing that tells you where to trust it and where to add guardrails. → [It's maths, not magic](/writing/its-maths-not-magic)

**Is compliance built in or bolted on?** If the control lives in the system's design, the audit is a formality. If it lives in a policy people are told to follow, it's a control waiting to fail.

There's one idea under all of it. AI is a component you apply with judgment, not a foundation you build a business on blindly. The teams that do well with it aren't the ones with the most models or the biggest frameworks. They're the ones who decided, on purpose, where it earns its place.`,
  },

  {
    slug: 'serverless-rag-for-cents',
    category: 'AI & Automation',
    featured: 1,
    title: 'No servers, AWS-grade uptime, cents a month',
    dek: 'The assistant on this site does real retrieval-augmented generation, streams its answers, and cites its sources — on managed services that scale to zero and can’t run up a surprise bill. Here’s the whole architecture.',
    date: '2026-06-15',
    readMins: 6,
    published: true,
    body: `The assistant on this site is a real one. It does retrieval-augmented generation over my articles, streams its answers, lets you switch the model behind it, and cites its sources. It also costs me close to nothing to run, and it cannot run up a surprise bill. That combination is worth explaining, because it's a genuinely new way to build this kind of thing, and a lot of teams are still doing it the expensive way.

Here's the whole architecture.

\`\`\`mermaid
flowchart TD
  U["Visitor"] -->|HTTPS| CF["CloudFront + S3 — static React site"]
  U -->|chat request| FU["Lambda Function URL (response streaming)"]
  FU --> G{"Guardrails — DynamoDB: rate limit + $5/day cap"}
  G -->|within budget| EMB["Bedrock Titan — embed the question"]
  EMB --> VEC["S3 Vectors — retrieve article chunks"]
  VEC --> GEN["Bedrock ConverseStream — Claude / Nova"]
  GEN -->|streamed answer + sources| U
\`\`\`

## No servers, anywhere

There isn't a server in this system. Not one I run, patch, scale, or pay for while it sits idle.

The site is static React, built to plain files and served from Amazon S3 behind CloudFront. A global CDN with AWS's availability, for cents at this traffic.

The chat runs on a single AWS Lambda function behind a streaming Function URL. Lambda is serverless in the literal sense: it doesn't exist until someone sends a message, it spins up to handle the request, streams the answer back token by token, and then it's gone. When nobody's using the assistant, which is most of the time for a personal site, it costs exactly zero. When ten people use it at once, AWS runs ten copies. I do nothing.

The model layer is Amazon Bedrock. No GPU to rent, no model to host, no inference server to keep warm. I call the Converse API, pay per token, and the model stays a swappable component.

The knowledge base is the new part. S3 Vectors is a vector store built into S3 itself. My articles are chunked, embedded, and stored as vectors, and the Lambda queries them to find the passages relevant to a question. Until recently, doing this meant running a vector database: an OpenSearch cluster or a managed service with nodes that run continuously and bill continuously. S3 Vectors removes that. The vectors sit in S3, you query on demand, and there's no cluster to operate. For a corpus this size it's effectively free.

The guardrails use DynamoDB in on-demand mode: a per-session rate limit and a hard daily budget. Pay per request, nothing when idle.

Every box in that diagram is a managed AWS service. None of them is a thing I keep running.

## What that buys

| | Traditional always-on | This (serverless) |
|---|---|---|
| Idle cost | App server + vector DB billing 24/7 | Zero — nothing runs when idle |
| Scaling | You provision and manage capacity | Automatic, to zero and to spikes |
| Ops | Patch, monitor, restart | None — managed services |
| Cost ceiling | However high it climbs | Hard daily cap, by design |

Three things fall out of building it this way.

**Uptime is AWS's problem, not mine.** Every component is a managed, multi-availability-zone service. There's no instance to fall over at 2am, no disk to fill, no process to restart. The assistant inherits the availability of S3, CloudFront, Lambda, Bedrock, and DynamoDB, which is about as good as it gets, and I maintain none of it.

**It scales to zero and to spikes, automatically.** No idle cost is the headline. A traditional version of this — an app server and a vector DB running around the clock — costs real money every month whether anyone uses it or not. This costs nothing when idle and absorbs a burst without me touching it.

**The cost is tiny and capped.** At this scale the running cost is a few dollars a month, mostly whatever model usage actually happens. On top of that a hard daily ceiling is wired into the guardrails, so even sustained abuse can't produce a bill bigger than a sandwich. Cheap by design, bounded by design.

## The honest trade-offs

Serverless isn't free of compromise. Lambda has cold starts, so the first request after a quiet spell is a little slower — fine for a chat, not for a high-frequency trading API. S3 Vectors is new, and built for this exact shape of problem: modest corpora, query-on-demand, not billion-vector workloads with millisecond SLAs. And you work within each service's quotas.

So this is the right pattern for a great many things: internal tools, scoped assistants, anything spiky or low-to-medium volume, anything where you don't want an ops burden. It's the wrong pattern for sustained high-throughput, ultra-low-latency systems, where dedicated infrastructure earns its keep. Knowing which one you have is the job.

## The point

A few years ago, standing up a RAG assistant with this kind of availability meant provisioning servers and a vector database and accepting a monthly bill before a single person used it. Now it's a handful of managed services, composed, that scale to zero and cost almost nothing. That shift is easy to miss and genuinely significant, because it drops the cost of trying something to near zero, which changes what's worth building at all.

The proof is the thing you're reading this next to. Open the assistant and ask it something. It'll spin up out of nothing, answer from my writing, cite its sources, and disappear again. That's the architecture, working.`,
  },

  {
    slug: 'when-the-answer-replaces-the-search-box',
    category: 'Technology Strategy',
    title: 'When the answer replaces the search box',
    dek: 'Search is quietly stopping being the default front door. Here’s why a small file called llms.txt — and factual, referenceable content — is how a brand stays findable when people ask an AI instead of Google.',
    date: '2026-06-15',
    readMins: 5,
    published: true,
    body: `For twenty-five years, being findable meant one thing: ranking on Google. You optimised pages, you chased keywords, you earned links, and a good rank put you in front of people. That whole game rested on one assumption — that when someone wants to know something, they type it into a search box and pick from a list of links.

That assumption is quietly breaking.

More and more, people don't search. They ask. They put the question to ChatGPT, Claude, Perplexity, or the AI answer sitting at the top of Google itself, and they get a synthesised answer back — not ten blue links, an answer. Often they never visit a website at all. The answer was enough.

\`\`\`mermaid
flowchart LR
  subgraph A["Old: search"]
    U1["Person"] --> S["Search engine"] --> L["A list of links"] --> W1["Your site"]
  end
  subgraph B["New: ask an AI"]
    U2["Person"] --> AI["AI assistant"] --> Ans["A synthesised answer, with citations"] --> W2["Your site — only if it gets cited"]
  end
\`\`\`

Here's the part that should get a brand's attention. In that new flow, your Google rank doesn't save you. If your content isn't in the answer, you're invisible — no matter how well that page ranks on a results screen nobody looked at. The question stops being "how do I rank?" and becomes "how do I get quoted?"

## Getting quoted is a different game

To rank, you needed pages search engines could crawl and links that vouched for you. To get quoted by an AI, you need something subtly different: content a model can find, trust, and attribute. That means facts stated clearly and specifically, in clean text, consistent across your site, easy to lift and cite. Vague marketing copy doesn't get quoted. A precise, checkable claim does.

It also changes how traffic comes back. A page that ranks well is one result seen by people who run that search. A clear, referenceable article is different: it can be cited across thousands of separate conversations, each one a different person, each citation a potential click back to you. You're no longer competing for one slot on one results page. You're becoming a source that gets quoted wherever the topic comes up.

## Where llms.txt comes in

This is why a quiet little standard called **llms.txt** matters more than it looks. It's a plain markdown file you put at the root of your site — like robots.txt, but for AI. It tells AI systems what your site is, who's behind it, and where your good, canonical content lives, in clean text they can actually use instead of fighting through your navigation and pop-ups.

It's early. Adoption by the AI crawlers is uneven, and no one should pretend llms.txt is universally honoured yet. But that's exactly the point. robots.txt and sitemaps were once new too, and the brands that adopted them early shaped how they got used. The cost of putting up an llms.txt and keeping your facts clean is close to nothing. The cost of being unfindable when the front door moves is your pipeline.

I practise this on this very site. There's an llms.txt at the root, the articles are written as clear factual pieces, and the assistant you can open in the corner answers from them and links its sources. That's the whole pattern in miniature: be the clean, referenceable source, and make it trivial for a machine to quote you and point people back.

## What to actually do

You don't need a project. Publish content that states real things clearly and consistently. Add an llms.txt and a sitemap. Keep your facts the same everywhere they appear, so a model isn't choosing between three versions of you. Make your site readable by machines, not walled off behind scripts and gates.

Search isn't dead. But it's no longer the only front door, and it's shrinking as the default. The brands that stay findable through the shift will be the ones whose facts are clean, structured, and easy for an AI to quote — and who were early enough to be the source it reaches for.`,
  },
  {
    slug: 'scale-the-system',
    category: 'Operating Models & Efficiency',
    title: 'Don’t scale the org chart — scale the system',
    dek: 'The reflex when work grows is to add people in proportion. The businesses that scale well grow the system instead — and nothing exposes the difference faster than growing by acquisition.',
    date: '2026-06-15',
    updated: '2026-06-17',
    readMins: 6,
    published: true,
    body: `The default answer to more work is more people. The queue gets longer, so you add someone to the queue. A new region opens, so you stand up a team for it. You buy a business and it arrives with its own finance, IT and HR, so you keep them. It’s automatic enough that most organisations never stop to ask whether the work needed a person at all, or whether the system they already had could have absorbed it.

That reflex has a cost, and it compounds. A new hire isn’t just a salary. It’s onboarding, management time, tooling, and another box on the chart everyone else now has to coordinate with. Grow that way and your cost base climbs in step with your output, so you never actually get more efficient. You just get bigger.

There’s another way to take on more: make the system carry it instead of the headcount.

\`\`\`mermaid
flowchart TB
  subgraph A["Scale the org chart"]
    direction LR
    O1["More work"] --> O2["Add people"] --> O3["Cost rises with output"]
  end
  subgraph B["Scale the system"]
    direction LR
    S1["More work"] --> S2["Cut waste, standardise, automate"] --> S3["Capacity rises, cost flat"]
  end
\`\`\`

I’ve run this. I once took an operation and roughly tripled the volume under management without adding a person to the team. Not by working anyone harder. I took the waste out of the process first, standardised what was left, and put automation on the parts that carried the volume. Headcount stayed flat while the output multiplied. That gap, between what you handle and what you have to staff, is where operating leverage actually lives.

It matters most when a business grows by acquisition. Every company you buy turns up complete: its own finance team, its own service desk, its own HR, its own systems doing more or less what yours already do. Keep all of it and you end up running five of everything. Five payrolls, five month-end closes, five copies of the same software. The duplication is invisible day to day and enormous in aggregate. A lot of the value in an acquisition isn’t in the asset. It’s in not running five of everything once it’s yours.

\`\`\`mermaid
flowchart TB
  subgraph DUP["Keep five of everything"]
    D1["Business 1 · finance · IT · HR"]
    D2["Business 2 · finance · IT · HR"]
    D3["Business 3 · finance · IT · HR"]
  end
  subgraph ONE["One shared spine"]
    A1["Business 1"] --> S["Shared finance · IT · core systems"]
    A2["Business 2"] --> S
    A3["Business 3"] --> S
  end
\`\`\`

So the integration question is rarely “how do we keep their systems running.” It’s “which of these functions should exist once, in the centre, and which are genuinely local.” One finance platform. One service desk every new business plugs into. A shared spine the portfolio connects to. Get that right and the next acquisition is mostly a connection, not a rebuild.

## What to centralise, what to leave local

The trap on the other side is centralising everything and grinding the business to a halt. So the question for each function is whether it's a differentiator or a utility. Utilities should exist once; differentiators stay close to where the value is actually made.

<div style="margin:24px 0;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-family:Arial,Helvetica,sans-serif">
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:16px 18px">
    <div style="color:#5ce1c6;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px">Centralise — one shared spine</div>
    <div style="color:#dce4ec;font-size:14px;line-height:1.6">Finance &amp; payroll · IT &amp; identity · HR · procurement · core platforms · data &amp; reporting</div>
  </div>
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:16px 18px">
    <div style="color:#76828e;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px">Keep local</div>
    <div style="color:#dce4ec;font-size:14px;line-height:1.6">Customer relationships · market-specific operations · anything that IS the product</div>
  </div>
</div>

In practice the playbook is the same each time you acquire: onboard the new business onto the shared spine, retire its duplicate functions, and measure the saving so the next integration is a known quantity rather than a debate. Done a few times, acquisitions stop adding a back office each and start plugging into one.

## This isn’t an argument against hiring

Some growth genuinely needs people: judgment, relationships, a capability you don’t have yet. The point is to make headcount a decision, not a reflex. Hire where a person adds something no system can. Stop hiring where the honest answer is that the work shouldn’t exist, or the system should swallow it. And don’t consolidate so hard that you build a single point of failure; centralise the function, not the fragility.

Here’s the test I’d put to any business that’s growing. If you doubled in size, how much bigger would your org chart have to get to cope? If the answer is “about double,” you’re scaling the org chart, and your costs will track your growth for as long as you do it. If the answer is “barely,” you’ve built something that scales. Most of the difference between growth that pays for itself and growth that just gets more expensive sits between those two answers.

Grow the system, not the org chart. Build the spine that absorbs the next unit of work, and the business can double while the headcount barely moves.`,
  },
  {
    slug: 'hire-for-judgment',
    category: 'Leadership & Operating Teams',
    title: 'Hire for judgment, not the tech stack',
    dek: 'The specific skills you hire for have a shorter and shorter shelf life. The thing that lasts — and the thing I actually interview for — is how someone thinks.',
    date: '2026-06-15',
    readMins: 4,
    published: true,
    body: `The tool you hired someone for is already going out of date. Maybe not this month, but soon. The framework they were expert in gets superseded. The platform reorganises under them. A model lands that makes half their hard-won technique irrelevant overnight. Hire purely for what someone knows how to use today and you’ve bought a depreciating asset.

This has always been true in technology. It’s just faster now. What a developer needed to know to be good two years ago isn’t what they need today, and it won’t be what they need next year. I said almost exactly this to someone recently: the job you do now isn’t the job you did six months ago, and keeping up with that is relentless. If the half-life of a specific skill is measured in months, hiring for that skill is buying a problem you’ll have again soon.

So I hire for judgment instead.

\`\`\`mermaid
flowchart TB
  subgraph T["Hire for the tool"]
    direction LR
    T1["Today’s stack"] --> T2["Skill expires"] --> T3["Re-hire / re-train"]
    T3 --> T1
  end
  subgraph J["Hire for judgment"]
    direction LR
    J1["New tool appears"] --> J2["Learns it fast, judges the fit"] --> J3["Capability compounds"]
  end
\`\`\`

<div style="margin:26px 0;font-family:Arial,Helvetica,sans-serif">
  <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#76828e;margin-bottom:10px">Value over a few years, as the tools keep changing</div>
  <svg viewBox="0 0 460 200" style="width:100%;max-width:520px;height:auto">
    <line x1="46" y1="16" x2="46" y2="168" stroke="rgba(220,228,236,.22)" stroke-width="1"/>
    <line x1="46" y1="168" x2="450" y2="168" stroke="rgba(220,228,236,.22)" stroke-width="1"/>
    <polyline points="46,50 450,148" fill="none" stroke="#9aa6b2" stroke-width="3"/>
    <polyline points="46,148 450,36" fill="none" stroke="#5ce1c6" stroke-width="3"/>
    <text x="46" y="188" fill="#76828e" font-size="12">now</text>
    <text x="450" y="188" fill="#76828e" font-size="12" text-anchor="end">a few years on</text>
  </svg>
  <div style="font-size:13px;line-height:1.55;color:#76828e;margin-top:8px"><span style="color:#5ce1c6;font-weight:700">Judgment</span> compounds — it makes every new tool faster to pick up. <span style="color:#9aa6b2;font-weight:700">A specific skill</span> decays as the stack moves on.</div>
</div>

Judgment is the part that doesn’t expire. It’s knowing how to reason about a trade-off, how to tell whether a new tool actually fits the problem or just looks impressive, how to learn something quickly and properly, when to trust your own output and when to check it. Someone with judgment and a shallow grip on this week’s tool will outrun someone with a deep grip on last year’s — because the first picks up the new thing in a fortnight, and the second is defending an investment that has quietly stopped paying.

It cuts deeper now that knowledge itself is almost free. The thing you used to hire for — the syntax, the API, the way a particular system is wired — is a token away from anyone with a model open in the next tab. What isn’t a token away is knowing which question to ask, whether the answer that comes back is actually right, and what to do with it. Critical thinking and a bit of the scientific method — form a view, test it, look honestly at what happened, change your mind — beat a memorised skill every time now, because the skill is the part that just got cheap.

## How you interview for it

You can’t test for judgment with a quiz on the current stack. That measures recall, which is exactly the thing that expires. I ask people how they made a hard decision, and listen for whether they reasoned it through or just followed the crowd. I ask about a time they were wrong, and what they changed afterwards. I ask how they’d size up a tool they’ve never touched. The detail of the answer matters less than the shape of the thinking behind it.

None of this is an argument against expertise. The deep stuff lasts: how systems really work under the abstraction, how to debug something you don’t understand yet, how to reason about cost and risk and failure. That isn’t tool knowledge, it’s foundation — and it’s the thing that lets someone absorb the next tool fast. What expires is the surface: the particular syntax, the particular dashboard, the particular vendor. Hire for the foundation and the judgment on top of it, not the surface.

And yes, sometimes you genuinely need someone who can use a specific tool on day one, because there’s a fire to put out now. Fine. But even then, weight where they’re heading over what they’ve already memorised. The person who keeps learning passes the one who peaked.

The team that wins isn’t the one that was perfectly configured for last year’s technology. It’s the one that re-skills itself without being told to, because you hired people who treat a new tool as a Tuesday, not a threat. Build that team and the constant churn stops being a staffing problem and starts being an edge — because most of your competitors are still hiring for the tool.

Hire for how someone thinks, not for what they currently know how to operate. The tools will keep changing. Judgment is the only line on the CV that appreciates.`,
  },
  {
    slug: 'build-security-in',
    category: 'Security, Risk & Trust',
    title: 'Build security in from the start — the returns compound',
    dek: 'Plan for the major standards on day one — 2FA, passkeys, SSO, GDPR and ISO by design — and the payoff compounds: faster audits, enterprise deals you can actually win, and migrations that pay for themselves.',
    date: '2026-06-15',
    readMins: 4,
    published: true,
    body: `Most teams treat security as something you add when you’re made to. A breach scare, an auditor, a big customer’s questionnaire — and suddenly there’s a scramble to bolt on the controls that should have been there all along. It’s slow, it’s expensive, and it’s the most stressful possible way to do it.

The better move is to decide upfront that the major standards are part of the foundation, not a later project. It costs a bit more thought at the start and pays back many times over.

Concretely, that foundation is a handful of decisions made on day one:

- Two-factor authentication as the absolute minimum, on everything, from the start.
- Device passcodes and passkeys, so you can begin removing the dependency on passwords altogether.
- Single sign-on, which redirects authentication risk to a specialist identity provider whose entire job is to get it right, instead of you reinventing it badly.
- GDPR and ISO 27001 designed in from the beginning — or, if you’ve inherited something that wasn’t, a planned migration to bring the core service up to them rather than patching around the edges.

None of that feels urgent before you need it, which is exactly why most teams skip it. But build on that foundation and a lot of things get easier at once.

\`\`\`mermaid
flowchart TB
  subgraph F["Built in from the start"]
    direction LR
    F1["2FA · passkeys · SSO · GDPR/ISO by design"] --> F2["Audits & reviews are a formality"] --> F3["Deals unlocked, returns compound"]
  end
  subgraph L["Bolted on later"]
    direction LR
    L1["Scramble when forced"] --> L2["Remediation project"] --> L3["Deals stalled, pay again"]
  end
\`\`\`

The audit confirms what’s already true instead of triggering a remediation project. The enterprise security review that stalls most of your competitors becomes a formality you pass while they’re still filling in the questionnaire. And the same controls that protect you quietly unlock customers you otherwise couldn’t sell to — the larger, more regulated, more valuable ones who won’t even start a conversation until you clear their bar.

That’s the part worth saying plainly to a CFO. Security planned in from the start isn’t only risk reduction. It’s a commercial capability — it opens markets and shortens sales cycles — so it deserves to be scored on both axes, not filed entirely under cost.

And if you didn’t build it in early, which most haven’t, the same logic still holds. It just costs more to get there. A migration is real work, but it’s work with an outsized return, because once the foundation is set everything else compounds off it: the reviews, the audits, the deals, the next feature all get cheaper and faster. The longer you leave it, the more you pay, and the more business you can’t win in the meantime.

One caution: the controls have to be real. Chasing a certificate you don’t actually live up to turns a genuine asset into a liability the first time someone checks. The point isn’t to look secure. It’s that being genuinely secure, and able to prove it, is the foundation everything else stands on.

Pour that foundation once and everything you build on it gets cheaper, faster, and easier to sell. Bolt it on later and you pay for it again every time.`,
  },
  {
    slug: 'how-lean-actually-works',
    category: 'Operating Models & Efficiency',
    title: 'Lean: remove what doesn’t need to be there',
    dek: 'What Lean actually is, how to run it as a continuous cycle — map, find the waste, eliminate, standardise, measure — and why removing waste beats working harder every time.',
    date: '2026-06-16',
    readMins: 6,
    published: true,
    body: `When something isn’t working well enough, the instinct is to add. Add people, add a tool, add a step to catch the problem, add effort. Lean starts from the opposite question: what’s already here that shouldn’t be? Most of the time the fastest improvement available to you isn’t doing more. It’s removing what was never needed.

I came up through Lean and Six Sigma before I came up through software and AI, and it’s still the discipline underneath everything I build. It’s worth understanding properly, because it’s widely misread as "cost-cutting" or a box of tools you roll out. It’s neither.

## What Lean actually is

Lean came out of the Toyota Production System, but the idea travels far beyond factories. At its core it’s a way of seeing any process as a flow of work toward something a customer wants, and then relentlessly removing the parts of that flow that don’t contribute to it.

The whole game rests on one distinction: value versus waste. Value is any step the customer would actually care about or pay for — the part that genuinely moves the work toward what they need. Waste is everything else. Not "everything bad" — everything that doesn’t add value, including a lot of work that feels productive.

The uncomfortable part is how much of most processes is waste. When you map office work honestly, the value-adding steps are often a small fraction of the total — Lean studies routinely put the waste as high as **90%**. The rest is waiting, rework, handoffs, checking, and steps that exist because of a decision nobody remembers.

<div style="margin:26px 0;font-family:Arial,Helvetica,sans-serif">
  <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#76828e;margin-bottom:10px">A typical office process, by value</div>
  <div style="display:flex;height:60px;border-radius:8px;overflow:hidden;border:1px solid rgba(220,228,236,.16)">
    <div style="flex:0 0 10%;background:#5ce1c6;color:#0a0e13;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px">~10%</div>
    <div style="flex:1;background:#1f2933;color:#dce4ec;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;letter-spacing:.02em">~90% &nbsp;waste — non-value-adding</div>
  </div>
  <div style="font-size:13px;line-height:1.5;color:#76828e;margin-top:8px">The mint sliver is the work a customer would actually pay for. The rest is waiting, rework, handoffs and steps nobody needs — and it's usually the overwhelming majority. Which is why speeding up the sliver barely moves anything, and attacking the waste moves everything.</div>
</div>

## The shapes waste takes

Lean names the common forms of waste, and the names are useful because they train you to see them. In a factory they’re things like overproduction and excess inventory. In the knowledge and technology work most of us do, they show up as:

- Waiting — work sitting in a queue for an approval, a handoff, a person.
- Rework — fixing defects that a problem upstream caused.
- Over-processing — doing more than the customer needs: the report nobody reads, the field nobody uses, five approvals where one would do.
- Handoffs — every time work passes between people or systems, time and context leak out.
- Searching — hunting for information, switching tools, re-finding what you already had.
- Unused talent — people doing work a system should do, or never asked for the improvement they can already see.

You don’t need the canonical list memorised. You need the habit of walking a process and asking, at each step: would the customer pay for this, or is it here for some other reason?

## How to approach it — as a cycle, not a project

This is the part people get wrong. Lean isn’t a project you run once and finish. It’s a loop you keep turning.

\`\`\`mermaid
flowchart LR
  M["Map the work as it really is"] --> F["Find the waste"]
  F --> E["Eliminate / redesign"]
  E --> S["Standardise what's left"]
  S --> Me["Measure the flow"]
  Me --> M
\`\`\`

**Map the work as it really is** — not the official diagram, the real path, including the detours and the waiting. You usually can’t see the waste until the whole flow is in front of you.

**Find the waste.** Walk the map and mark every step that doesn’t add value. Be honest; the comfortable steps are often the wasteful ones.

**Eliminate or redesign.** Remove what shouldn’t exist. For what’s left, ask whether it can be simplified, combined, or made to flow without stopping. Removal first, optimisation second.

**Standardise what’s left.** Once a process is genuinely better, write down the new way so it sticks and everyone works to it. Skip this and it quietly drifts back.

**Measure the flow.** Then go around again. The standard you just set is the new baseline to improve from, not the finish line.

That last point is the whole philosophy: continuous improvement, what Toyota calls kaizen. Small improvements, made constantly, compounding. Each loop the system gets a little better — and because the gains compound, "a little better, repeatedly" beats "a big transformation, once" almost every time.

## The principles underneath it

The cycle is how you run Lean. These seven principles are the values that guide it — what to optimise for as you turn the loop.

<div style="margin:22px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-family:Arial,Helvetica,sans-serif">
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px">
    <div style="color:#5ce1c6;font-size:11px;font-weight:700;letter-spacing:.1em">01</div>
    <div style="color:#dce4ec;font-weight:700;font-size:14px;margin:2px 0 3px">Eliminate waste</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">Remove anything a customer wouldn't pay for.</div>
  </div>
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px">
    <div style="color:#5ce1c6;font-size:11px;font-weight:700;letter-spacing:.1em">02</div>
    <div style="color:#dce4ec;font-weight:700;font-size:14px;margin:2px 0 3px">Build quality in</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">Stop defects at the source; don't inspect them out later.</div>
  </div>
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px">
    <div style="color:#5ce1c6;font-size:11px;font-weight:700;letter-spacing:.1em">03</div>
    <div style="color:#dce4ec;font-weight:700;font-size:14px;margin:2px 0 3px">Create knowledge</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">Treat the process as something you keep learning and writing down.</div>
  </div>
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px">
    <div style="color:#5ce1c6;font-size:11px;font-weight:700;letter-spacing:.1em">04</div>
    <div style="color:#dce4ec;font-weight:700;font-size:14px;margin:2px 0 3px">Defer commitment</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">Decide as late as you responsibly can, when you know the most.</div>
  </div>
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px">
    <div style="color:#5ce1c6;font-size:11px;font-weight:700;letter-spacing:.1em">05</div>
    <div style="color:#dce4ec;font-weight:700;font-size:14px;margin:2px 0 3px">Deliver fast</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">Short cycles; speed shortens feedback and exposes problems.</div>
  </div>
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px">
    <div style="color:#5ce1c6;font-size:11px;font-weight:700;letter-spacing:.1em">06</div>
    <div style="color:#dce4ec;font-weight:700;font-size:14px;margin:2px 0 3px">Respect people</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">The people doing the work see the waste first. Ask them.</div>
  </div>
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px;grid-column:1 / -1">
    <div style="color:#5ce1c6;font-size:11px;font-weight:700;letter-spacing:.1em">07</div>
    <div style="color:#dce4ec;font-weight:700;font-size:14px;margin:2px 0 3px">Optimise the whole</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">Improve the end-to-end flow, not one local step. A faster step feeding a longer queue improves nothing.</div>
  </div>
</div>

## How to measure it

Lean measures the flow, not the activity. Busy is not the same as productive, and most traditional metrics measure busy.

- **Lead time** — how long from a request starting to it being done, including all the waiting.
- **Cycle time** — how long the actual work takes once someone is working on it.
- **Process efficiency** — value-adding time as a fraction of total lead time. Calculate it once and it changes how you see everything: it’s often shockingly low, single-digit percentages, which means most of the time your work is just sitting there.
- **Rework rate** — how often something has to be done twice.

The gap between cycle time and lead time is pure waiting, and waiting is usually the biggest and cheapest waste to attack. You don’t have to make anyone work faster. You have to stop the work from sitting.

## Why removing waste is so powerful

Here's the idea that makes it click. Your value-adding work is a small slice, so improving *it* — a faster tool, more people — barely changes the total. The waste is the big slice, so attacking *that*, for the same effort, changes everything.

<div style="margin:24px 0;font-family:Arial,Helvetica,sans-serif">
  <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#76828e;margin-bottom:14px">Same effort, very different result</div>
  <div style="font-size:13px;color:#dce4ec;font-weight:700;margin-bottom:6px">Speed up the value-adding work (new tool, more people)</div>
  <div style="display:flex;width:95%;height:30px;border-radius:6px;overflow:hidden;border:1px solid rgba(220,228,236,.16)">
    <div style="flex:0 0 11%;background:#5ce1c6"></div>
    <div style="flex:1;background:#1f2933"></div>
  </div>
  <div style="font-size:12px;color:#76828e;margin:5px 0 18px">Halve the ~10% that adds value &rarr; about <b style="color:#dce4ec">5% shorter overall</b>. Barely moves.</div>
  <div style="font-size:13px;color:#dce4ec;font-weight:700;margin-bottom:6px">Eliminate the waste</div>
  <div style="display:flex;width:55%;height:30px;border-radius:6px;overflow:hidden;border:1px solid rgba(220,228,236,.16)">
    <div style="flex:0 0 18%;background:#5ce1c6"></div>
    <div style="flex:1;background:#1f2933"></div>
  </div>
  <div style="font-size:12px;color:#76828e;margin-top:5px">Cut the ~90% waste in half &rarr; about <b style="color:#5ce1c6">45% shorter overall</b> — plus better quality and freed capacity.</div>
</div>

Three reasons it beats working harder.

**It’s permanent and nearly free.** Speeding up a wasteful step costs money and effort, and you’ve still got the waste, now running faster. Removing the step costs you once and pays back forever. This is exactly why automating a broken process is the most expensive automation there is — you’ve cemented the waste at speed. ([Don’t automate waste](/writing/dont-automate-waste).)

**It improves quality, speed and cost at the same time.** In most work those feel like trade-offs: go faster, lose quality; raise quality, spend more. Removing waste isn’t a trade-off. A handoff you delete is faster and less error-prone and cheaper all at once, because the delay and the defects and the cost were all coming from the same unnecessary step.

**It creates capacity out of nothing.** Every hour of waiting or rework you remove is an hour returned, without hiring anyone. I once took a support operation, stripped the waste out of its processes, standardised what remained, and then automated the valuable parts — and tripled the volume it could handle without adding a single person. The automation got the credit; the waste removal is what made it possible. ([Scale the system, not the org chart](/writing/scale-the-system).)

## The trap to avoid

Lean done wrong becomes "make people work harder," which is the opposite of the point. The waste isn’t the people — it’s the friction around them: the dumb handoffs, the waiting, the rework caused upstream. Real Lean has a second pillar alongside removing waste, and it’s respect for the people doing the work, because they’re the ones who can see the waste first if you actually ask them. Strip out what makes their work harder and the speed comes for free.

And don’t optimise one step in isolation. A faster step that just feeds a longer queue downstream improves nothing. You’re after the flow of the whole thing, not the local win.

So before you add anything — a tool, a person, an AI, another process — walk the work as it really is and ask what shouldn’t be there. The cheapest, fastest, most durable improvement available to you is almost always removal. Then standardise it, measure it, and go around again.`,
  },
  {
    slug: 'cite-dont-train',
    category: 'Security, Risk & Trust',
    title: 'Cite me, don’t train on me',
    dek: 'The crawlers we call “AI” are doing three different jobs — and you can now say yes to some and no to others. Why I let assistants quote and link this site but opted it out of model training, and the honest limits of where that line holds.',
    date: '2026-06-17',
    readMins: 6,
    published: true,
    body: `When this site gets read, the logs tell me who did the reading. More and more, the answer isn’t a who. It’s a what — ClaudeBot, GPTBot, OAI-SearchBot, PerplexityBot — a steady stream of machines working through my writing so that some model, somewhere, can do something with it later.

The reflex splits two ways. Slam the door: block every AI crawler and keep your words to yourself. Or leave it wide open and trust that being in the training data pays off somehow. Both reflexes skip the question worth asking, which is more interesting than either: what is each of these machines actually *doing* with the page, and which of those things do I want?

## Three jobs wearing one label

The crawlers we lump together as “AI” are doing at least three different jobs.

Some are collecting **training data** — pages to fold into the next model’s weights. This is the one people picture when they say AI is scraping their site. It takes your words and gives nothing back: your sentence might shape an answer a year from now, with no link, no name, no trace it was ever yours.

Some are building a **search index** — pages they can retrieve and *cite* when a user asks a question. This is the engine behind ChatGPT search, Perplexity and the rest. When it uses your page, it shows your page: a link, a source, a reader who might click through.

And some are **live fetches** — a model reading your page right now, because a real person just asked it something your page answers. That is the moment a citation actually appears in someone’s chat window.

Until recently these arrived under one banner, and you took them or left them as a set. That has changed, and it’s the change the whole decision turns on. OpenAI, Anthropic, Google and the others now run these as separate crawlers with separate names — which makes them separate decisions. You can say yes to one and no to another.

<div style="margin:24px 0;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-family:Arial,Helvetica,sans-serif">
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:14px 16px">
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#76828e">Training crawler</div>
    <div style="color:#dce4ec;font-weight:700;font-size:14px;margin:6px 0 4px">Takes — gives nothing back</div>
    <div style="color:#76828e;font-size:12px;line-height:1.5">Folds your words into the next model. No link, no credit, no reader. You can’t watch it happen and can’t undo it.</div>
    <div style="color:#76828e;font-size:11px;margin-top:8px">GPTBot · ClaudeBot · CCBot</div>
    <div style="color:#9aa6b2;font-weight:700;font-size:13px;margin-top:8px">→ Opt out</div>
  </div>
  <div style="border:1px solid #5ce1c6;border-radius:8px;padding:14px 16px">
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5ce1c6">Citation crawler</div>
    <div style="color:#dce4ec;font-weight:700;font-size:14px;margin:6px 0 4px">Uses you by sending readers</div>
    <div style="color:#76828e;font-size:12px;line-height:1.5">Indexes the page so an assistant can quote and link it. The old search-engine deal: it shows you to answer someone.</div>
    <div style="color:#76828e;font-size:11px;margin-top:8px">OAI-SearchBot · Claude-User · PerplexityBot</div>
    <div style="color:#5ce1c6;font-weight:700;font-size:13px;margin-top:8px">→ Allow</div>
  </div>
</div>

## The line I actually want

Seen that way, the line draws itself. I’m happy, glad even, to have an assistant read this site and point a reader to it. That’s the deal I’ve always had with a search engine: index me, and in return send people my way. Citation is just attribution with a link, and attribution is the thing writers want.

Training is the other deal. My words go in and nothing comes back — no reader sent my way, no name on the output. I’m not precious about it. But “use my work, uncredited, to build something you’ll sell” is a bargain I’d like to be asked about first. Given the choice, I decline.

So: allow the crawlers whose whole job is to surface and link me, opt out of the ones that only absorb. That distinction now lives in two places.

The first is robots.txt — the note every well-behaved crawler reads on its way in. Mine says, in effect, *training crawlers stay out, citation crawlers welcome*:

\`\`\`
# training crawlers — opt out
User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Disallow: /

# citation crawlers — welcome
User-agent: OAI-SearchBot
Allow: /
User-agent: Claude-User
Allow: /
\`\`\`

The second is enforcement — because a sign on the door only stops the people who read signs. A small function at my CDN edge checks each visitor’s name against the opt-out list and returns a polite 403 to the training crawlers before they ever reach a page.

\`\`\`mermaid
flowchart TB
  R["A crawler arrives"] --> P["robots.txt — the polite ask"]
  P --> Q{"Does it comply?"}
  Q -->|"compliant"| L["Training bot leaves"]
  Q -->|"ignores the ask"| E{"Edge: training user-agent?"}
  E -->|"yes"| B["403 — blocked"]
  E -->|"no"| S["200 — cited and served"]
\`\`\`

## Where the line gets blurry — and why that’s the point

Here’s where it stops being a config snippet and becomes a judgment call. That’s the part I care about. A clean rule with no caveats is usually a rule you haven’t finished understanding. This one has four worth saying out loud.

<div style="margin:24px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-family:Arial,Helvetica,sans-serif">
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px">
    <div style="color:#dce4ec;font-weight:700;font-size:13px;margin-bottom:3px">It’s an honour system</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">Compliant crawlers obey. Determined ones spoof a browser and walk straight in. The edge 403 catches the lazy; only network-level rules stop the rest.</div>
  </div>
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px">
    <div style="color:#dce4ec;font-weight:700;font-size:13px;margin-bottom:3px">Google won’t split</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">Google runs training and answer-citation off one switch. Opt out of its training and you lose its citation too — so I left that one on, on purpose.</div>
  </div>
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px">
    <div style="color:#dce4ec;font-weight:700;font-size:13px;margin-bottom:3px">Attribution isn’t enforceable</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">“Use it only if you credit me” isn’t something a text file can compel. The nearest you get is allowing only the crawlers whose job is to credit you.</div>
  </div>
  <div style="border:1px solid rgba(220,228,236,.16);border-radius:8px;padding:12px 14px">
    <div style="color:#dce4ec;font-weight:700;font-size:13px;margin-bottom:3px">The past stays put</div>
    <div style="color:#76828e;font-size:12px;line-height:1.45">Whatever’s already in a model’s weights is staying there. This governs what happens from here, not what already happened.</div>
  </div>
</div>

None of those four make the line worthless. They make it *honest*. I know exactly what it does — opts me cleanly out of the compliant trainers, keeps me in the citation lane — and exactly what it doesn’t: stop a determined impersonator, or claw back what’s already learned. A control you understand the edges of beats ten you assume are airtight.

## Why bother, if the door doesn’t fully lock?

Because the ground is moving, and this is how you stand on the right part of it. For twenty years the deal was simple: let Google index you, get found in search. That deal is being rewritten in real time. [The answer is replacing the search box](/writing/when-the-answer-replaces-the-search-box), and the new prize is being the source an assistant *cites*, not the tenth blue link. Citation is the visibility that’s about to matter. Training is value you hand over to power someone else’s product. Opting into one and out of the other isn’t paranoia; it’s reading where the value is going and standing there.

And there’s a smaller, truer reason. This is what applying AI with judgment looks like at the smallest possible scale. No policy team, no vendor, no six-month working group — just understanding the machinery well enough to draw a line exactly where you want it, then drawing it. The whole thing took an afternoon: an hour to work out what each crawler really does, the rest to make my own site honour the distinction. The scarce part wasn’t the code. It was knowing the line was there to be drawn.

That’s the move I’d want from anyone running technology: not “AI good” or “AI bad,” but *which part, on what terms, and can our own systems hold that line* — the same instinct as [building the control in from the start](/writing/build-security-in) rather than bolting it on later. If you want to govern how AI uses what your organisation produces, this is the rehearsal: small enough to do yourself in an afternoon, and a faithful model of the larger version. Start with the question none of the default settings ask for you — of everything reading you, what is each one actually doing, and which of those did you agree to?`,
  },
]

export const getArticle = (slug) => articles.find((a) => a.slug === slug && a.published)
export const publishedArticles = () =>
  articles.filter((a) => a.published).sort((a, b) => b.date.localeCompare(a.date))

// "Start here" picks for the top of the index, ordered by the `featured` number.
export const featuredArticles = () =>
  articles.filter((a) => a.published && a.featured).sort((a, b) => a.featured - b.featured)

// Display order for the Perspectives index. Leads with executive-altitude themes;
// AI & Automation is the deep bench beneath them. Leadership appears once written into.
export const CATEGORIES = [
  'Technology Strategy',
  'Operating Models & Efficiency',
  'Security, Risk & Trust',
  'AI & Automation',
  'Leadership & Operating Teams',
]

// Published articles grouped by category in CATEGORIES order, newest first within
// each group. Empty categories are omitted, so the index never shows a bare bucket.
export const articlesByCategory = () => {
  const live = publishedArticles()
  return CATEGORIES
    .map((category) => ({ category, items: live.filter((a) => a.category === category) }))
    .filter((group) => group.items.length > 0)
}
