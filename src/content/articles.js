// Writing — articles for nealon.tech/writing.
// Each entry: { slug, title, dek, date (ISO), readMins, published, body (markdown) }.
// Add an article = add an entry. published:false keeps it off the index.

export const articles = [
  {
    slug: 'model-provider-independence',
    title: 'Build for the model you’ll want to replace',
    dek: 'Why the assistant on this site swaps between Claude and Nova on a dropdown — and why model independence is a board-level decision, not a developer preference.',
    date: '2026-06-14',
    readMins: 4,
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

## Why it's a board-level question

The person who picks the model is making a procurement and risk decision, whether they frame it that way or not. Single-supplier dependence on the most strategically important new capability in a generation is exactly the kind of thing a CIO should have a view on, not something that gets decided by whichever SDK a developer reached for first.

Own the capability. Rent the model. Keep the receipt so you can hand it back.`,
  },

  {
    slug: 'workflow-or-agent',
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
    title: 'Don’t automate waste',
    dek: 'The most expensive automation is the one that makes a broken process run faster. Why a waste analysis, not a technology wishlist, should decide what you automate.',
    date: '2026-06-14',
    readMins: 4,
    published: true,
    body: `The most expensive automation I have seen is the one that takes a wasteful process and makes it run faster. Now the waste is automated. It is harder to see, harder to question, and you have spent money cementing it in place.

This is the trap with AI and automation right now. The technology is exciting, so teams go looking for things to automate. They pick the steps that hurt the most and make them faster. What they skip is the question that should come first: should this step exist at all?

I came up through Lean and Six Sigma before I came up through automation, and the order those disciplines teach is the order that works. Before you make a process faster, you map it and you find the waste. The steps that exist only because of a decision nobody remembers. The handoffs that add a day and no value. The rework caused by a defect three steps upstream. The reports nobody reads. Most processes are full of this, and none of it should be automated. It should be deleted.

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
    title: 'Applied AI: what to think about before you ship',
    dek: 'A short field guide for developers and systems engineers putting AI into real products — the questions I’d want answered before anything goes live.',
    date: '2026-06-15',
    readMins: 3,
    published: true,
    body: `AI is easy to demo and hard to ship well. A prototype that dazzles in a meeting is a different thing from a system you'd put in front of customers, on a budget, with your name on it. Over building a fair bit of the second kind, I've ended up with a short list of questions I ask before anything goes live. Each one has a longer piece behind it.

**Does it even need AI?** Most things shipped as "agents" are workflows in disguise. If you can draw the flowchart, build the flowchart. Use autonomy only where you genuinely can't predict the next step. → [Most "agents" are workflows in disguise](/writing/workflow-or-agent)

**Is the process worth automating at all?** The most expensive automation makes a broken process run faster. Find and cut the waste first, then automate what's left. → [Don't automate waste](/writing/dont-automate-waste)

**Do you own the capability, or rent it?** Put an abstraction between your application and the model so it's a swappable component, not a foundation. → [Build for the model you'll want to replace](/writing/model-provider-independence)

**Do you know your dependencies?** List every AI tool you rely on and make sure the critical one has a backup. Ten minutes now, or a dark day later. → [List every AI tool you depend on](/writing/audit-your-ai-dependencies)

**What happens when it fails?** It will. A mature practice closes the loop from failure to fix to regression test automatically, instead of debugging by hand forever. → [Your agent harness should repair itself](/writing/self-healing-harness)

**Do you know what it actually is?** It predicts the next token. It doesn't understand or remember. Knowing that tells you where to trust it and where to add guardrails. → [It's maths, not magic](/writing/its-maths-not-magic)

**Is compliance built in or bolted on?** If the control lives in the system's design, the audit is a formality. If it lives in a policy people are told to follow, it's a control waiting to fail.

There's one idea under all of it. AI is a component you apply with judgment, not a foundation you build a business on blindly. The teams that do well with it aren't the ones with the most models or the biggest frameworks. They're the ones who decided, on purpose, where it earns its place.`,
  },
]

export const getArticle = (slug) => articles.find((a) => a.slug === slug && a.published)
export const publishedArticles = () =>
  articles.filter((a) => a.published).sort((a, b) => b.date.localeCompare(a.date))
