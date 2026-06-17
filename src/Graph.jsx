import { useEffect, useRef, useState } from 'react'

// lazy-load cytoscape only when the graph page is actually viewed (keeps it out of the
// main bundle — same trick as Mermaid.jsx with mermaid).
let cyPromise = null
const loadCy = () => (cyPromise ||= Promise.all([import('cytoscape'), import('cytoscape-fcose')])
  .then(([cyMod, fcoseMod]) => { const cytoscape = cyMod.default; cytoscape.use(fcoseMod.default); return cytoscape }))

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
// HSL -> hex. cytoscape's colour parser does NOT accept modern space-separated
// hsl() ("hsl(167 55% 62%)"), so hand it hex instead or every node renders grey.
function hslHex(h, s, l) {
  h = ((h % 360) + 360) % 360
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// one cohesive colour per category, fanned around the live theme-accent hue
function categoryColors(cats) {
  const base = toHsl(parse(cssVar('--accent', '#5ce1c6')))
  const spread = [0, 50, -44, 100, 154]
  const s = Math.min(0.7, Math.max(0.46, base.s))
  const out = {}
  cats.forEach((c, i) => { out[c] = hslHex(base.h + (spread[i] ?? i * 40), s, 0.62) })
  return out
}

const HUB_DEGREE = 3   // nodes this connected stay labelled at rest
const LABEL_ZOOM = 1.15 // zoom past this and every label appears

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
      const bg = cssVar('--bg', '#0a0e13')
      const deg = {}; data.nodes.forEach((n) => (deg[n.id] = 0)); data.edges.forEach((e) => { deg[e.source]++; deg[e.target]++ })
      const elements = [
        ...data.nodes.map((n, i) => ({
          data: { id: n.id, label: n.label, url: n.url, deg: deg[n.id], color: palette[n.category] || accent },
          classes: deg[n.id] >= HUB_DEGREE ? 'hub' : '',
          // deterministic circle seed -> fcose refines from this into a balanced blob
          // (avoids fcose's spectral init degenerating to a diagonal on a disconnected graph)
          position: { x: 300 * Math.cos((2 * Math.PI * i) / data.nodes.length), y: 300 * Math.sin((2 * Math.PI * i) / data.nodes.length) },
        })),
        ...data.edges.map((e, i) => ({ data: { id: 'e' + i, source: e.source, target: e.target, type: e.type } })),
      ]
      if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null }
      const cy = cytoscape({
        container: boxRef.current,
        elements,
        minZoom: 0.35, maxZoom: 3, wheelSensitivity: 0.22,
        style: [
          { selector: 'node', style: {
            'background-color': 'data(color)', 'background-opacity': 0.95,
            width: 'mapData(deg, 1, 7, 18, 50)', height: 'mapData(deg, 1, 7, 18, 50)',
            'border-width': 1.5, 'border-color': 'data(color)', 'border-opacity': 0.9,
            label: 'data(label)', color: ink, 'font-family': mono, 'font-size': 10,
            'text-wrap': 'wrap', 'text-max-width': 104, 'text-valign': 'bottom', 'text-margin-y': 5,
            'text-background-color': bg, 'text-background-opacity': 0.8, 'text-background-padding': 3, 'text-background-shape': 'roundrectangle',
            'text-opacity': 0, 'min-zoomed-font-size': 6,
          } },
          // labels appear for hubs, when zoomed in, or on hover (see handlers)
          { selector: 'node.hub, node.zoomed, node.near', style: { 'text-opacity': 1 } },
          { selector: 'edge', style: { 'curve-style': 'bezier', 'line-color': line, width: 1 } },
          { selector: 'edge[type="link"]', style: { width: 1.6, 'line-color': accent, 'line-opacity': 0.5, 'target-arrow-shape': 'triangle', 'target-arrow-color': accent, 'arrow-scale': 0.75 } },
          { selector: 'edge[type="similar"]', style: { 'line-style': 'dashed', 'line-color': line, width: 1 } },
          { selector: '.dim', style: { opacity: 0.08 } },
          { selector: 'node.lit', style: { 'border-width': 3, 'border-color': accent, 'border-opacity': 1, 'text-opacity': 1 } },
        ],
      })
      cyRef.current = cy

      // labels declutter by default and reveal as you zoom in — scales to many nodes
      const syncZoomLabels = () => {
        const on = cy.zoom() >= LABEL_ZOOM
        cy.batch(() => { on ? cy.nodes().addClass('zoomed') : cy.nodes().removeClass('zoomed') })
      }
      cy.on('zoom', syncZoomLabels)

      // Run fcose (deterministic: randomize:false refining the circle seed above), then
      // stretch the settled layout horizontally to the canvas aspect ratio. A roughly-square
      // network otherwise gets fit() to the canvas HEIGHT, leaving the wide sides empty.
      const fitToCanvas = () => {
        const box = boxRef.current
        if (box && box.clientWidth && box.clientHeight) {
          const bb = cy.nodes().boundingBox()
          const canvasAspect = box.clientWidth / box.clientHeight
          const layoutAspect = bb.w && bb.h ? bb.w / bb.h : canvasAspect
          if (layoutAspect < canvasAspect) {
            const sx = Math.min(2.8, canvasAspect / layoutAspect)
            const cx = (bb.x1 + bb.x2) / 2
            cy.batch(() => cy.nodes().forEach((n) => { const p = n.position(); n.position({ x: cx + (p.x - cx) * sx, y: p.y }) }))
          }
        }
        cy.fit(undefined, 36)
        syncZoomLabels()
      }
      const lay = cy.layout({ name: 'fcose', quality: 'proof', randomize: false, animate: false, packComponents: false, nodeSeparation: 95, idealEdgeLength: 90, nodeRepulsion: 4500, gravity: 0.45, gravityRange: 3.5, padding: 38 })
      lay.one('layoutstop', fitToCanvas)
      lay.run()

      const box = boxRef.current
      cy.on('tap', 'node', (evt) => { const url = evt.target.data('url'); if (url) navRef.current(url) })
      cy.on('mouseover', 'node', (evt) => {
        box.style.cursor = 'pointer'
        const nh = evt.target.closedNeighborhood()
        cy.elements().addClass('dim')
        nh.removeClass('dim'); nh.nodes().addClass('near'); evt.target.addClass('lit')
      })
      cy.on('mouseout', 'node', () => { box.style.cursor = 'grab'; cy.elements().removeClass('dim near lit') })
    }).catch(() => { if (!cancelled) setErr(true) })
    return () => { cancelled = true; if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null } }
  }, [data, theme])

  const palette = data ? categoryColors(data.categories) : {}
  const resetView = () => cyRef.current?.animate({ fit: { padding: 40 } }, { duration: 250 })

  return (
    <section className="sec wrap graph-page" id="graph">
      <span className="sec-ghost" aria-hidden="true">⌗</span>
      <div className="sec-head reveal in">
        <span className="idx">Map</span>
        <h2>How the writing connects</h2>
      </div>
      <p className="lede reveal in">
        Every published piece is a node, wired two ways: the links I drew between articles, and
        semantic similarity from the same embeddings that power the assistant on this site. Scroll to
        zoom, drag to pan, hover a node to reveal its title and connections, click to read it.
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
          <div className="graph-stage">
            <div className="graph-canvas" ref={boxRef} role="img" aria-label="Knowledge graph of the articles" />
            {data && <button type="button" className="graph-reset" onClick={resetView}>reset view</button>}
          </div>
          <p className="graph-hint">{data ? `${data.nodes.length} pieces · ${data.edges.length} connections · hubs stay labelled, the rest appear as you zoom or hover` : 'building graph…'}</p>
        </>
      )}
    </section>
  )
}
