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
]

export const getArticle = (slug) => articles.find((a) => a.slug === slug && a.published)
export const publishedArticles = () =>
  articles.filter((a) => a.published).sort((a, b) => b.date.localeCompare(a.date))
