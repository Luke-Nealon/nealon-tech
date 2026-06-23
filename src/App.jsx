import { useEffect, useState } from 'react'
import useReveal from './hooks/useReveal.js'
import Assistant from './Assistant.jsx'
import { WritingIndex, Article } from './Writing.jsx'
import GraphView from './Graph.jsx'
import { hero, links, firsts, notes, about, assistant, perspectives, footer } from './content.js'
import { featuredArticles, publishedArticles, CATEGORIES } from './content/articles.js'

const NAV_SECTIONS = [
  { id: 'top', label: 'Top' },
  { id: 'intro', label: 'Intro' },
  { id: 'notes', label: 'Positions' },
  { id: 'perspectives', label: 'Writing' },
  { id: 'assistant', label: 'Live demo' },
  { id: 'contact', label: 'Contact' },
]

function PageNav({ showDots }) {
  const [active, setActive] = useState('top')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const d = document.documentElement
      const max = d.scrollHeight - d.clientHeight
      setProgress(max > 0 ? Math.min(100, (d.scrollTop / max) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  useEffect(() => {
    if (!showDots) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: '-45% 0px -45% 0px' }
    )
    NAV_SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [showDots])

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <>
      <div className="scroll-progress" style={{ width: progress + '%' }} aria-hidden="true" />
      {showDots && (
        <nav className="page-dots" aria-label="Page sections">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`page-dot ${active === s.id ? 'on' : ''}`}
              onClick={() => go(s.id)}
              aria-label={s.label}
              aria-current={active === s.id ? 'true' : undefined}
            >
              <span className="page-dot-label">{s.label}</span>
              <span className="page-dot-mark" aria-hidden="true" />
            </button>
          ))}
        </nav>
      )}
    </>
  )
}

function Reveal({ as: Tag = 'div', className = '', delay = 0, children }) {
  const ref = useReveal()
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--d': `${delay}s` }}>
      {children}
    </Tag>
  )
}

function SectionHead({ index, title, lede, ghost }) {
  return (
    <>
      <span className="sec-ghost" aria-hidden="true">
        {ghost}
      </span>
      <Reveal className="sec-head">
        <span className="idx">{index}</span>
        <h2>{title}</h2>
      </Reveal>
      {lede && (
        <Reveal as="p" className="lede" delay={0.08}>
          {lede}
        </Reveal>
      )}
    </>
  )
}

function Header({ navigate, onHome }) {
  const go = (e, path) => { e.preventDefault(); navigate(path) }
  return (
    <header className="top wrap rise">
      <a className="logo" href="/" onClick={(e) => go(e, '/')} aria-label="Luke Nealon — home">
        LN<span>.</span>
      </a>
      <nav aria-label="Sections">
        <a href="/#notes" onClick={onHome ? undefined : (e) => go(e, '/#notes')}>Positions</a>
        <a href="/writing" onClick={(e) => go(e, '/writing')}>Perspectives</a>
        <a href="/graph" onClick={(e) => go(e, '/graph')}>Knowledge map</a>
        <a href="/about" onClick={(e) => go(e, '/about')}>About</a>
        <a href="/#contact" onClick={onHome ? undefined : (e) => go(e, '/#contact')}>Contact</a>
      </nav>
    </header>
  )
}

function Hero({ navigate }) {
  return (
    <section className="hero wrap" id="top">
      <p className="kicker rise d1">
        <span className="kick-text">{hero.kicker}</span>
      </p>
      <h1 className="name rise d2">
        Luke <em>Nealon.</em>
      </h1>
      <p className="statement rise d3">
        Twenty years turning emerging technology into <em>measurable business value</em> —
        fluent from <em>boardroom to codebase</em>.
      </p>
      <div className="hero-links rise d4">
        <a className="hero-cta" href="/writing" onClick={(e) => { e.preventDefault(); navigate('/writing') }}>
          Read the perspectives <span aria-hidden="true">→</span>
        </a>
        <a href={links.linkedin} target="_blank" rel="noreferrer">
          LinkedIn <span aria-hidden="true">↗</span>
        </a>
        <a href={links.github} target="_blank" rel="noreferrer">
          GitHub <span aria-hidden="true">↗</span>
        </a>
        <a href={`mailto:${links.email}`}>
          Email <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  )
}

// Homepage opener: the short bio + facts, then an "Early, on purpose" teaser
// card that links through to the full timeline on /about (#track-record).
function Intro({ navigate }) {
  return (
    <section className="sec wrap" id="intro">
      <SectionHead index="01" title="Who I am" ghost="01" />
      <div className="about-grid">
        <Reveal as="p" className="about-big">
          {about.big}
        </Reveal>
        <Facts />
      </div>
      <a
        className="graph-teaser reveal in"
        href="/about#track-record"
        onClick={(e) => { e.preventDefault(); navigate('/about#track-record') }}
      >
        <span className="graph-teaser-label">{firsts.title}</span>
        <p>{firsts.teaser}</p>
        <span className="graph-teaser-cta">See the full track record <span aria-hidden="true">→</span></span>
      </a>
    </section>
  )
}

function Notes({ navigate }) {
  return (
    <section className="sec wrap" id="notes">
      <SectionHead index="02" title={notes.title} lede={notes.lede} ghost="02" />
      <div className="notes-grid">
        {notes.items.map((note, i) => (
          <Reveal className="note" key={note.title} delay={Math.min(i * 0.06, 0.25)}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            <h3>{note.title}</h3>
            <p>{note.body}</p>
            {note.to && (
              <a
                className="note-link"
                href={`/writing/${note.to}`}
                onClick={(e) => { e.preventDefault(); navigate(`/writing/${note.to}`) }}
              >
                Read the full argument <span aria-hidden="true">→</span>
              </a>
            )}
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Perspectives({ navigate }) {
  const featured = featuredArticles().slice(0, 3)
  const live = publishedArticles()
  const themes = CATEGORIES.filter((c) => live.some((a) => a.category === c)).length
  const go = (to) => (e) => { e.preventDefault(); navigate(to) }
  return (
    <section className="sec wrap" id="perspectives">
      <SectionHead index="03" title={perspectives.title} lede={perspectives.lede} ghost="✎" />
      <p className="perspectives-count reveal in">{live.length} essays across {themes} themes</p>
      <div className="feature-grid reveal in">
        {featured.map((a) => (
          <a key={a.slug} className="feature-card" href={`/writing/${a.slug}`} onClick={go(`/writing/${a.slug}`)}>
            <span className="feature-cat">{a.category}</span>
            <h3>{a.title}</h3>
            <p>{a.dek}</p>
            <span className="feature-meta">{a.readMins} min read</span>
          </a>
        ))}
      </div>
      <a className="perspectives-all reveal in" href="/writing" onClick={go('/writing')}>
        {perspectives.cta} <span aria-hidden="true">→</span>
      </a>
      <a className="graph-teaser reveal in" href="/graph" onClick={go('/graph')}>
        <span className="graph-teaser-label">{perspectives.graph.label}</span>
        <p>{perspectives.graph.line}</p>
        <span className="graph-teaser-cta">{perspectives.graph.cta} <span aria-hidden="true">→</span></span>
      </a>
    </section>
  )
}

function Facts() {
  return (
    <Reveal as="ul" className="facts" delay={0.1}>
      {about.facts.map((f) => (
        <li key={f.k}>
          <span className="k">{f.k}</span>
          <span className="v">
            {f.href ? (
              <a href={f.href} target="_blank" rel="noreferrer">
                {f.v} <span aria-hidden="true">↗</span>
              </a>
            ) : (
              f.v
            )}
          </span>
        </li>
      ))}
    </Reveal>
  )
}

// Dedicated /about page: the personal-brand "who is this" — short bio + facts,
// then the full "Early, on purpose" timeline (the homepage only teases it).
function AboutPage() {
  useEffect(() => {
    document.title = 'About — Luke Nealon'
    return () => { document.title = 'Luke Nealon — Technology, Data & AI Executive' }
  }, [])
  return (
    <>
      <section className="sec wrap" id="about">
        <span className="sec-ghost" aria-hidden="true">§</span>
        <div className="about-head">
          <div className="sec-head reveal in">
            <span className="idx">About</span>
            <h1>Who I am</h1>
          </div>
          <img className="headshot-about reveal in" src="/luke.jpg" alt="Luke Nealon" width="150" height="150" />
        </div>
        <div className="about-grid">
          <Reveal as="p" className="about-big">
            {about.big}
          </Reveal>
          <Facts />
        </div>
      </section>
      <section className="sec wrap" id="track-record">
        <span className="sec-ghost" aria-hidden="true">✦</span>
        <div className="sec-head reveal in">
          <span className="idx">Track record</span>
          <h2>{firsts.title}</h2>
        </div>
        <Reveal as="p" className="lede" delay={0.08}>
          {firsts.lede}
        </Reveal>
        <div className="ledger">
          {firsts.rows.map((row, i) => (
            <Reveal className="row" key={row.year + row.title} delay={Math.min(i * 0.05, 0.3)}>
              <span className="yr">{row.year}</span>
              <h3>{row.title}</h3>
              <p>{row.detail}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  )
}

function AssistantDemo({ navigate }) {
  const openAssistant = () => window.dispatchEvent(new CustomEvent('open-assistant'))
  return (
    <section className="sec wrap" id="assistant">
      <SectionHead index="04" title={assistant.title} lede={assistant.body} ghost="✦" />
      <div className="demo-points">
        {assistant.points.map((p, i) => (
          <Reveal className="demo-point" key={p.h} delay={Math.min(i * 0.06, 0.2)}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            <h3>{p.h}</h3>
            <p>{p.t}</p>
          </Reveal>
        ))}
      </div>
      <Reveal className="demo-try" delay={0.1}>
        <span className="demo-try-label">Try this</span>
        <p>{assistant.tryThis}</p>
      </Reveal>
      <Reveal className="demo-cta" delay={0.15}>
        <button className="demo-open" onClick={openAssistant}>{assistant.cta} <span aria-hidden="true">→</span></button>
        <a className="demo-secondary" href="/writing" onClick={(e) => { e.preventDefault(); navigate('/writing') }}>{assistant.secondary}</a>
      </Reveal>
    </section>
  )
}

function Footer() {
  return (
    <footer id="contact">
      <div className="wrap">
        <Reveal>
          <a className="cta" href={`mailto:${links.email}`}>
            Let’s <em>talk.</em>
          </a>
        </Reveal>
        <Reveal className="foot-row" delay={0.1}>
          <span>{links.email}</span>
          <span>
            <a href={links.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            {' · '}
            <a href={links.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            {' · '}
            <a href="/privacy.html">
              Privacy
            </a>
          </span>
        </Reveal>
        <Reveal as="p" className="colophon" delay={0.15}>
          {footer.colophon} © {new Date().getFullYear()} Luke Nealon, Sydney.
        </Reveal>
      </div>
    </footer>
  )
}

function Home({ navigate }) {
  return (
    <main>
      <Hero navigate={navigate} />
      <Intro navigate={navigate} />
      <Notes navigate={navigate} />
      <Perspectives navigate={navigate} />
      <AssistantDemo navigate={navigate} />
    </main>
  )
}

// tiny History-API router — CloudFront serves index.html for any path (SPA fallback)
function usePath() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const navigate = (to) => {
    const [p, hash] = to.split('#')
    if (p === window.location.pathname || p === '') {
      if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.history.pushState({}, '', to)
      setPath(p)
      window.scrollTo(0, 0)
      if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView(), 60)
    }
  }
  return [path, navigate]
}

export default function App() {
  const [path, navigate] = usePath()
  const onHome = path === '/' || path === ''
  let view
  if (path.startsWith('/writing/')) view = <Article slug={decodeURIComponent(path.slice('/writing/'.length))} navigate={navigate} />
  else if (path === '/writing') view = <main><WritingIndex navigate={navigate} /></main>
  else if (path === '/graph') view = <main><GraphView navigate={navigate} /></main>
  else if (path === '/about') view = <main><AboutPage /></main>
  else view = <Home navigate={navigate} />

  return (
    <div className="page">
      <PageNav showDots={onHome} />
      <Header navigate={navigate} onHome={onHome} />
      {view}
      <Footer />
      <Assistant navigate={navigate} />
    </div>
  )
}
