import { useEffect, useState } from 'react'
import { marked } from 'marked'
import Mermaid from './Mermaid.jsx'
import { publishedArticles, featuredArticles, CATEGORIES, getArticle } from './content/articles.js'

marked.setOptions({ breaks: false, gfm: true })

// split markdown into prose + ```mermaid diagram blocks
function bodySegments(md) {
  const segs = []
  const re = /```mermaid\n?([\s\S]*?)```/g
  let last = 0
  let m
  while ((m = re.exec(md)) !== null) {
    if (m.index > last) segs.push({ type: 'md', text: md.slice(last, m.index) })
    segs.push({ type: 'mermaid', code: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < md.length) segs.push({ type: 'md', text: md.slice(last) })
  return segs
}

// Year-only by default; "Updated <year>" when an article carries an `updated` date.
// Keeps the index from broadcasting that a batch was published on the same day.
function displayDate(a) {
  const year = (iso) => iso.slice(0, 4)
  return a.updated ? `Updated ${year(a.updated)}` : year(a.date)
}

export function WritingIndex({ navigate }) {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState('All')
  useEffect(() => {
    document.title = 'Perspectives — Luke Nealon'
    return () => { document.title = 'Luke Nealon — Technology & Digital Innovation Executive' }
  }, [])

  const all = publishedArticles()
  // Only offer pills for categories that actually have published pieces.
  const present = CATEGORIES.filter((c) => all.some((a) => a.category === c))
  const q = query.trim().toLowerCase()
  const matches = all.filter(
    (a) =>
      (activeCat === 'All' || a.category === activeCat) &&
      (!q || `${a.title} ${a.dek} ${a.category} ${a.body}`.toLowerCase().includes(q))
  )
  const groups = present
    .map((category) => ({ category, items: matches.filter((a) => a.category === category) }))
    .filter((g) => g.items.length > 0)
  const filtering = q !== '' || activeCat !== 'All'
  const featured = featuredArticles()

  return (
    <section className="sec wrap" id="writing">
      <span className="sec-ghost" aria-hidden="true">✎</span>
      <div className="sec-head reveal in">
        <span className="idx">Perspectives</span>
        <h2>Field notes, long form</h2>
      </div>
      <p className="lede reveal in">
        Working notes on technology, AI, and the business of running it — written to be read
        by an operator, not an audience.
      </p>

      {!filtering && featured.length > 0 && (
        <div className="writing-featured reveal in">
          <span className="writing-featured-label">Start here</span>
          <div className="feature-grid">
            {featured.map((a) => (
              <a
                key={a.slug}
                className="feature-card"
                href={`/writing/${a.slug}`}
                onClick={(e) => { e.preventDefault(); navigate(`/writing/${a.slug}`) }}
              >
                <span className="feature-cat">{a.category}</span>
                <h3>{a.title}</h3>
                <p>{a.dek}</p>
                <span className="feature-meta">{displayDate(a)} · {a.readMins} min read</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="writing-controls reveal in">
        <input
          type="search"
          className="writing-search"
          placeholder="Search perspectives…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search perspectives"
        />
        <div className="writing-filters" aria-label="Filter by topic">
          <button
            className={`writing-pill${activeCat === 'All' ? ' is-active' : ''}`}
            onClick={() => setActiveCat('All')}
          >
            All
          </button>
          {present.map((c) => (
            <button
              key={c}
              className={`writing-pill${activeCat === c ? ' is-active' : ''}`}
              onClick={() => setActiveCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {filtering && (
          <span className="writing-count">
            {matches.length} of {all.length}
            {filtering && (
              <button
                className="writing-clear"
                onClick={() => { setQuery(''); setActiveCat('All') }}
              >
                Clear
              </button>
            )}
          </span>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="writing-empty">No perspectives match that search.</p>
      ) : (
        groups.map(({ category, items }) => (
          <div className="writing-group" key={category}>
            <h3 className="writing-cat">{category}</h3>
            <div className="writing-list">
              {items.map((a) => (
                <a
                  key={a.slug}
                  className="writing-card"
                  href={`/writing/${a.slug}`}
                  onClick={(e) => { e.preventDefault(); navigate(`/writing/${a.slug}`) }}
                >
                  <span className="writing-meta">{displayDate(a)} · {a.readMins} min read</span>
                  <h4>{a.title}</h4>
                  <p>{a.dek}</p>
                  <span className="writing-more">Read →</span>
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  )
}

export function Article({ slug, navigate }) {
  const article = getArticle(slug)
  useEffect(() => { window.scrollTo(0, 0) }, [slug])
  useEffect(() => {
    document.title = article ? `${article.title} — Luke Nealon` : 'Not found — Luke Nealon'
    return () => { document.title = 'Luke Nealon — Technology & Digital Innovation Executive' }
  }, [article])

  if (!article) {
    return (
      <section className="sec wrap">
        <h2 className="article-title">Not found</h2>
        <p className="lede">That article doesn't exist (yet).</p>
        <a className="writing-back" href="/writing" onClick={(e) => { e.preventDefault(); navigate('/writing') }}>← All perspectives</a>
      </section>
    )
  }

  return (
    <article className="article">
      <a className="writing-back" href="/writing" onClick={(e) => { e.preventDefault(); navigate('/writing') }}>← All perspectives</a>
      <span className="article-meta">{article.category} · {displayDate(article)} · {article.readMins} min read</span>
      <h1 className="article-title">{article.title}</h1>
      <p className="article-dek">{article.dek}</p>
      <div className="article-body">
        {bodySegments(article.body).map((s, i) =>
          s.type === 'mermaid'
            ? <Mermaid key={i} code={s.code} />
            : <div key={i} dangerouslySetInnerHTML={{ __html: marked.parse(s.text) }} />
        )}
      </div>
      <div className="article-foot">
        <span>Luke Nealon</span>
        <a href="/writing" onClick={(e) => { e.preventDefault(); navigate('/writing') }}>More perspectives →</a>
      </div>
    </article>
  )
}
