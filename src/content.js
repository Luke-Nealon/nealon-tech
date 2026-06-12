// All site copy lives here — edit freely without touching components.
// Rule: no current-employer or client names on this site.

export const hero = {
  kicker: 'Sydney, Australia — Technology & Digital Innovation',
  statement:
    'Twenty years of putting bleeding-edge technology to work on real business problems — and writing the code that proves it.',
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
  title: 'Field notes',
  lede: 'Positions I will defend in a boardroom.',
  items: [
    {
      title: 'Most businesses need a workflow, not an AI wrapper.',
      body: 'Deterministic pipeline first; AI only at the steps that need judgment — categorise, summarise, draft. The platforms I run are deliberately not marketed as “AI-powered”. Clients buy faster resolutions, not model names.',
    },
    {
      title: 'Where AI earns its place in an existing process.',
      body: 'Detection and categorisation at intake. Summarisation at handover. Drafts behind human approval. Pattern-finding in data nobody has time to read. The test is simple: it should remove a queue, not add a chatbot.',
    },
    {
      title: 'Early adoption starts with the problem, not the product.',
      body: 'I don’t adopt technology for novelty. It starts with a business problem that needs a custom solution or a willingness to experiment — then the new tool is proven safe, given an exit path, and measured against the outcome. Every first on this page paid for itself.',
    },
    {
      title: 'Compliance by design beats compliance by audit.',
      body: 'If the terminal wipes itself after every session, you don’t need a policy telling agents not to store card numbers. Build the rule into the system and the audit becomes a formality.',
    },
  ],
}

export const about = {
  title: 'About',
  big: 'I’m a technology executive in Sydney, currently leading digital innovation for a global managed-services provider. I turn operational complexity into systems, products, and measurable business value — and I still write the code that proves it.',
  facts: [
    { k: 'Now', v: 'Digital innovation leadership — global managed services' },
    { k: 'Focus', v: 'Applied AI · product · operations systemisation' },
    { k: 'Stack', v: 'React / TypeScript · Node.js · Python · AWS · IaC' },
    { k: 'History', v: 'The formal version lives on LinkedIn', href: 'https://linkedin.com/in/luke-nealon' },
  ],
}

export const footer = {
  cta: 'Let’s talk.',
  colophon:
    'Designed and built by hand — React, no templates, served from an S3 bucket.',
}
