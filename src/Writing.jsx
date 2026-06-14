import { useEffect } from 'react'
import { marked } from 'marked'
import Mermaid from './Mermaid.jsx'
import { publishedArticles, getArticle } from './content/articles.js'

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

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function WritingIndex({ navigate }) {
  const items = publishedArticles()
  useEffect(() => {
    document.title = 'Writing — Luke Nealon'
    return () => { document.title = 'Luke Nealon — Technology & Digital Innovation Executive' }
  }, [])
  return (
    <section className="sec wrap" id="writing">
      <span className="sec-ghost" aria-hidden="true">✎</span>
      <div className="sec-head reveal in">
        <span className="idx">Writing</span>
        <h2>Field notes, long form</h2>
      </div>
      <p className="lede reveal in">
        Working notes on building AI that earns its place — what I'd want a developer or systems
        engineer to think about before they ship.
      </p>
      <div className="writing-list">
        {items.map((a) => (
          <a
            key={a.slug}
            className="writing-card"
            href={`/writing/${a.slug}`}
            onClick={(e) => { e.preventDefault(); navigate(`/writing/${a.slug}`) }}
          >
            <span className="writing-meta">{fmtDate(a.date)} · {a.readMins} min read</span>
            <h3>{a.title}</h3>
            <p>{a.dek}</p>
            <span className="writing-more">Read →</span>
          </a>
        ))}
      </div>
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
        <a className="writing-back" href="/writing" onClick={(e) => { e.preventDefault(); navigate('/writing') }}>← All writing</a>
      </section>
    )
  }

  return (
    <article className="article">
      <a className="writing-back" href="/writing" onClick={(e) => { e.preventDefault(); navigate('/writing') }}>← All writing</a>
      <span className="article-meta">{fmtDate(article.date)} · {article.readMins} min read</span>
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
        <a href="/writing" onClick={(e) => { e.preventDefault(); navigate('/writing') }}>More writing →</a>
      </div>
    </article>
  )
}
