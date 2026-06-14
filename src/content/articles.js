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
]

export const getArticle = (slug) => articles.find((a) => a.slug === slug && a.published)
export const publishedArticles = () =>
  articles.filter((a) => a.published).sort((a, b) => b.date.localeCompare(a.date))
