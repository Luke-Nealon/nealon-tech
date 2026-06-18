// All site copy lives here — edit freely without touching components.
// Rule: no current-employer or client names on this site.

export const hero = {
  kicker: 'Technology, Data & AI Executive · Sydney, Australia',
  statement:
    'Twenty years turning emerging technology into measurable business value — fluent from boardroom to codebase.',
}

export const links = {
  email: 'luke@nealon.tech',
  linkedin: 'https://linkedin.com/in/luke-nealon',
  github: 'https://github.com/Luke-Nealon',
}

export const firsts = {
  title: 'Early, on purpose',
  lede: 'A career of early adoption — never for novelty. Every technology here was picked up in pursuit of a specific business problem, proven safe, and tied to a measurable result.',
  rows: [
    {
      year: '2011',
      title: 'Enterprise mobility at national scale',
      detail:
        'One of the top five certified BlackBerry implementation specialists in Australia — thousands of devices under management for bank-grade clients, with team processes rebuilt into an automated pipeline ~60% faster than the manual workflow it replaced.',
    },
    {
      year: '2014',
      title: 'SD-WAN before it had a category',
      detail:
        'Replaced costly MPLS with centrally managed Meraki SD-WAN across 17 countries including China — an international first for the platform.',
    },
    {
      year: '2016',
      title: 'Zero-footprint endpoints, cloud telephony',
      detail:
        'A custom WebRTC calling platform on Chrome kiosk devices at ~10% of PC cost — session wipe-and-reload for PCI compliance by design, and calling costs cut 80% on a cloud Asterisk stack. One of the top five Chrome-device deployments in Australia.',
    },
    {
      year: '2020',
      title: 'A 30-day remote pivot',
      detail:
        'When COVID closed the offices, an office-bound global call centre was rebuilt as a secure mobile PWA — automated pre-call quality checks, personal devices, zero additional cost. Thirty days, door to door.',
    },
    {
      year: '2023',
      title: 'Production AI in support operations',
      detail:
        'A production support platform on AWS Bedrock + Claude — RAG knowledge base, Teams bot, live network diagnostics — shipped while much of the industry was still writing AI strategy decks.',
    },
    {
      year: '2024',
      title: 'Fixing live platforms with the people who built them',
      detail:
        'Critical client incidents worked alongside the founders of a major SD-WAN platform, co-writing fixes in real time; design-input and early-access programmes with two global SASE vendors.',
    },
  ],
}

export const notes = {
  title: 'Positions',
  lede: 'Positions I will defend in a boardroom — each one argued in full.',
  items: [
    {
      title: 'Most businesses need a workflow, not an AI wrapper.',
      body: 'Deterministic pipeline first; AI only at the steps that need judgment — categorise, summarise, draft. The platforms I run are deliberately not marketed as “AI-powered”. Clients buy faster resolutions, not model names.',
      to: 'workflow-or-agent',
    },
    {
      title: 'Where AI earns its place in an existing process.',
      body: 'Detection and categorisation at intake. Summarisation at handover. Drafts behind human approval. Pattern-finding in data nobody has time to read. The test is simple: it should remove a queue, not add a chatbot.',
      to: 'applied-ai-field-guide',
    },
    {
      title: 'Early adoption starts with the problem, not the product.',
      body: 'I don’t adopt technology for novelty. It starts with a business problem that needs a custom solution or a willingness to experiment — then the new tool is proven safe, given an exit path, and measured against the outcome. Every first on this page paid for itself.',
      to: 'dont-automate-waste',
    },
    {
      title: 'Compliance by design beats compliance by audit.',
      body: 'A policy that tells people what not to do is a control waiting to fail; a system where the wrong thing is impossible never does. If sensitive data is never stored in the first place, nothing needs to protect it. Build the rule into the architecture and the audit just confirms what was already true.',
      to: 'build-security-in',
    },
  ],
}

export const about = {
  title: 'About',
  big: 'I’m a technology executive in Sydney. I built and led a global digital-innovation function from the ground up — teams across four continents — turning operational complexity into systems and products that pay for themselves, with the technical depth to direct the build and know it’s right.',
  facts: [
    { k: 'Now', v: 'Digital innovation leadership — global managed services' },
    { k: 'Led', v: 'Global teams across Australia, the UK, the US and Asia' },
    { k: 'Focus', v: 'Data & applied AI · operating models · product' },
    { k: 'Stack', v: 'React / TypeScript · Node.js · Python · AWS · IaC' },
    { k: 'History', v: 'The formal version lives on LinkedIn', href: 'https://linkedin.com/in/luke-nealon' },
  ],
}

export const assistant = {
  title: 'Ask it about my thinking',
  body: 'There’s a working AI assistant in the bottom-right corner. It runs retrieval-augmented generation over everything I’ve written here, so you can interrogate the ideas directly — and watch it do a few things most site chatbots can’t.',
  points: [
    { h: 'Ask it anything I’ve written about', t: 'It answers from my own articles and cites them, so you can check it. Ask its take on model independence, Lean, or treating data as a product — it replies grounded in what I actually wrote, not a guess.' },
    { h: 'It draws, not just types', t: 'Ask for a diagram or a timeline and it renders one live — flowcharts, sequences, timelines — the same kind of visuals you see in the articles, generated on the spot instead of a wall of text.' },
    { h: 'Swap the model mid-conversation', t: 'Change the AI behind it — Claude, Amazon Nova, Alibaba Qwen — in the middle of a chat and it keeps going. Most products are welded to one vendor; this one treats the model as a replaceable part, on a capped daily budget.' },
  ],
  tryThis: 'Try this: ask it to “draw a timeline of the firsts on this site”, then switch the model from the dropdown and ask a follow-up — same conversation, a different AI behind it.',
  cta: 'Open the assistant',
  secondary: 'Read the perspectives',
}

export const perspectives = {
  title: 'Perspectives',
  lede: 'A growing body of writing on technology, data and applied AI — for operators, not an audience.',
  cta: 'Read all perspectives',
  graph: {
    label: 'The knowledge map',
    line: 'Every essay is a node, wired by what the assistant’s own embeddings judge to be related — the latent structure of how the thinking connects.',
    cta: 'Explore the map',
  },
}

export const footer = {
  cta: 'Let’s talk.',
  colophon:
    'Designed and built by hand — React, no templates, no servers, on AWS.',
}
