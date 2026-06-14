import { useEffect, useState } from 'react'
import useReveal from './hooks/useReveal.js'
import Assistant from './Assistant.jsx'
import { WritingIndex, Article } from './Writing.jsx'
import { hero, links, firsts, notes, about, footer } from './content.js'

const THEMES = ['control', 'terminal']

function ThemeSwitcher() {
  const [theme, setTheme] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('theme')
    if (fromUrl && THEMES.includes(fromUrl)) return fromUrl
    const stored = localStorage.getItem('theme')
    return THEMES.includes(stored) ? stored : 'control'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <div className="themer" role="group" aria-label="Colour theme">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          className={t === theme ? 'on' : ''}
          aria-pressed={t === theme}
          onClick={() => setTheme(t)}
        >
          {t}
        </button>
      ))}
    </div>
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
        <a href="/#firsts" onClick={onHome ? undefined : (e) => go(e, '/#firsts')}>Firsts</a>
        <a href="/#notes" onClick={onHome ? undefined : (e) => go(e, '/#notes')}>Notes</a>
        <a href="/writing" onClick={(e) => go(e, '/writing')}>Writing</a>
        <a href="/#about" onClick={onHome ? undefined : (e) => go(e, '/#about')}>About</a>
        <a href="/#contact" onClick={onHome ? undefined : (e) => go(e, '/#contact')}>Contact</a>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero wrap" id="top">
      <p className="kicker rise d1">
        <span className="kick-text">{hero.kicker}</span>
      </p>
      <h1 className="name rise d2">
        Luke <em>Nealon.</em>
      </h1>
      <p className="statement rise d3">
        Twenty years of putting <em>bleeding-edge technology</em> to work on{' '}
        <em>real business problems</em> — fluent from boardroom to codebase.
      </p>
      <div className="hero-links rise d4">
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
      <span className="coords" aria-hidden="true">
        33.8688° S — 151.2093° E
      </span>
    </section>
  )
}

function Firsts() {
  return (
    <section className="sec wrap" id="firsts">
      <SectionHead index="01" title={firsts.title} lede={firsts.lede} ghost="01" />
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
  )
}

function Notes() {
  return (
    <section className="sec wrap" id="notes">
      <SectionHead index="02" title={notes.title} lede={notes.lede} ghost="02" />
      <div className="notes-grid">
        {notes.items.map((note, i) => (
          <Reveal className="note" key={note.title} delay={Math.min(i * 0.06, 0.25)}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            <h3>{note.title}</h3>
            <p>{note.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function About() {
  return (
    <section className="sec wrap" id="about">
      <SectionHead index="03" title={about.title} ghost="03" />
      <div className="about-grid">
        <Reveal as="p" className="about-big">
          {about.big}
        </Reveal>
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
      </div>
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

function Home() {
  return (
    <main>
      <Hero />
      <Firsts />
      <Notes />
      <About />
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
  else view = <Home />

  return (
    <div className="page">
      <Header navigate={navigate} onHome={onHome} />
      {view}
      <Footer />
      <Assistant />
      <ThemeSwitcher />
      {/* terminal-theme atmosphere: CRT scanlines + sweeping beam (display:none elsewhere) */}
      <div className="fx fx-scan" aria-hidden="true" />
      <div className="fx fx-beam" aria-hidden="true" />
    </div>
  )
}
