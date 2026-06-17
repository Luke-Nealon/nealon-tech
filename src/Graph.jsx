import { useEffect, useRef, useState } from 'react'

// lazy-load cytoscape only when the graph page is actually viewed (keeps it out of the
// main bundle — same trick as Mermaid.jsx with mermaid).
let cyPromise = null
const loadCy = () => (cyPromise ||= import('cytoscape').then((m) => m.default))

const cssVar = (n, f) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f

function parse(c) {
  c = (c || '').trim()
  if (c.startsWith('#')) {
    let h = c.slice(1)
    if (h.length === 3) h = h.split('').map((x) => x + x).join('')
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
  }
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (m) { const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2] } }
  return { r: 92, g: 225, b: 198 }
}
function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  let h = 0, s = 0; const l = (mx + mn) / 2
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h: h * 360, s, l }
}
const hsl = (h, s, l) => `hsl(${Math.round(((h % 360) + 360) % 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`

// one cohesive colour per category, fanned around the live theme-accent hue
function categoryColors(cats) {
  const base = toHsl(parse(cssVar('--accent', '#5ce1c6')))
  const spread = [0, 50, -44, 100, 154]
  const s = Math.min(0.7, Math.max(0.46, base.s))
  const out = {}
  cats.forEach((c, i) => { out[c] = hsl(base.h + (spread[i] ?? i * 40), s, 0.62) })
  return out
}

export default function GraphView({ navigate }) {
  const boxRef = useRef(null)
  const cyRef = useRef(null)
  const navRef = useRef(navigate); navRef.current = navigate
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'control')

  // recolour live when the site theme is toggled (same pattern as Mermaid.jsx)
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(document.documentElement.getAttribute('data-theme') || 'control'))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    fetch('/graph.json').then((r) => r.json()).then(setData).catch(() => setErr(true))
  }, [])

  useEffect(() => {
    if (!data || !boxRef.current) return
    let cancelled = false
    loadCy().then((cytoscape) => {
      if (cancelled || !boxRef.current) return
      const palette = categoryColors(data.categories)
      const accent = cssVar('--accent', '#5ce1c6')
      const ink = cssVar('--ink', '#dce4ec')
      const line = cssVar('--line', 'rgba(220,228,236,.13)')
      const mono = cssVar('--mono', 'monospace')
      const deg = {}; data.nodes.forEach((n) => (deg[n.id] = 0)); data.edges.forEach((e) => { deg[e.source]++; deg[e.target]++ })
      const elements = [
        ...data.nodes.map((n) => ({ data: { id: n.id, label: n.label, url: n.url, deg: deg[n.id], color: palette[n.category] || accent } })),
        ...data.edges.map((e, i) => ({ data: { id: 'e' + i, source: e.source, target: e.target, type: e.type } })),
      ]
      if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null }
      const cy = cytoscape({
        container: boxRef.current,
        elements,
        minZoom: 0.3, maxZoom: 2.5, wheelSensitivity: 0.22,
        layout: { name: 'cose', animate: false, padding: 30, nodeRepulsion: 9000, idealEdgeLength: 95, nodeOverlap: 18, gravity: 0.32, randomize: true },
        style: [
          { selector: 'node', style: {
            'background-color': 'data(color)', 'background-opacity': 0.92,
            width: 'mapData(deg, 1, 7, 16, 46)', height: 'mapData(deg, 1, 7, 16, 46)',
            'border-width': 1.5, 'border-color': 'data(color)', 'border-opacity': 0.85,
            label: 'data(label)', color: ink, 'font-family': mono, 'font-size': 10.5,
            'text-wrap': 'wrap', 'text-max-width': 124, 'text-valign': 'bottom', 'text-margin-y': 5,
            'min-zoomed-font-size': 7,
          } },
          { selector: 'edge', style: { 'curve-style': 'bezier', 'line-color': line, width: 1 } },
          { selector: 'edge[type="link"]', style: { width: 1.6, 'line-color': accent, 'line-opacity': 0.5, 'target-arrow-shape': 'triangle', 'target-arrow-color': accent, 'arrow-scale': 0.75 } },
          { selector: 'edge[type="similar"]', style: { 'line-style': 'dashed', 'line-color': line, width: 1 } },
          { selector: '.dim', style: { opacity: 0.1 } },
          { selector: '.lit', style: { 'border-width': 3, 'border-color': accent, 'border-opacity': 1 } },
        ],
      })
      cyRef.current = cy
      cy.ready(() => cy.fit(undefined, 38))
      const box = boxRef.current
      cy.on('tap', 'node', (evt) => { const url = evt.target.data('url'); if (url) navRef.current(url) })
      cy.on('mouseover', 'node', (evt) => {
        box.style.cursor = 'pointer'
        const nh = evt.target.closedNeighborhood()
        cy.elements().addClass('dim'); nh.removeClass('dim'); evt.target.addClass('lit')
      })
      cy.on('mouseout', 'node', () => { box.style.cursor = 'grab'; cy.elements().removeClass('dim lit') })
    }).catch(() => { if (!cancelled) setErr(true) })
    return () => { cancelled = true; if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null } }
  }, [data, theme])

  const palette = data ? categoryColors(data.categories) : {}

  return (
    <section className="sec wrap graph-page" id="graph">
      <span className="sec-ghost" aria-hidden="true">⌗</span>
      <div className="sec-head reveal in">
        <span className="idx">Map</span>
        <h2>How the writing connects</h2>
      </div>
      <p className="lede reveal in">
        Every published piece is a node, wired two ways: the links I drew between articles, and
        semantic similarity from the same embeddings that power the assistant on this site. Drag to
        explore, hover to isolate a piece, click a node to read it.
      </p>
      {err ? (
        <p className="writing-empty">
          The graph couldn’t load.{' '}
          <a href="/writing" onClick={(e) => { e.preventDefault(); navigate('/writing') }}>Browse the writing instead →</a>
        </p>
      ) : (
        <>
          <div className="graph-legend reveal in">
            {data?.categories.map((c) => (
              <span className="graph-legend-item" key={c}>
                <span className="graph-swatch" style={{ background: palette[c] }} /> {c}
              </span>
            ))}
            <span className="graph-legend-item"><span className="graph-line graph-line-link" /> linked</span>
            <span className="graph-legend-item"><span className="graph-line graph-line-sim" /> related</span>
          </div>
          <div className="graph-canvas" ref={boxRef} role="img" aria-label="Knowledge graph of the articles" />
          <p className="graph-hint">{data ? `${data.nodes.length} pieces · ${data.edges.length} connections` : 'building graph…'}</p>
        </>
      )}
    </section>
  )
}
