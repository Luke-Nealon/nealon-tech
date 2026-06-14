import { useEffect, useState } from 'react'

// lazy-load mermaid only when a diagram actually appears
let mermaidPromise = null
function loadMermaid() {
  if (!mermaidPromise) mermaidPromise = import('mermaid').then((m) => m.default)
  return mermaidPromise
}

/* ---- colour helpers: derive an on-theme palette from the live CSS variables ---- */
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
function parse(color) {
  color = color.trim()
  if (color.startsWith('#')) {
    let h = color.slice(1)
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 }
  }
  const m = color.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const p = m[1].split(',').map((s) => parseFloat(s))
    return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }
  }
  return { r: 120, g: 130, b: 140, a: 1 }
}
function rgba({ r, g, b }, a) { return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})` }
function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0; const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h: h * 360, s, l }
}
function fromHsl({ h, s, l }) {
  h = ((h % 360) + 360) % 360 / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t) => {
    t = (t + 1) % 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 }
}
// analogous palette around the theme accent — cohesive but distinct per stage
function buildPalette(accent) {
  const base = toHsl(parse(accent))
  return [0, 24, 48, -24, -48, 12].map((deg) => fromHsl({ h: base.h + deg, s: Math.min(0.85, base.s), l: Math.max(0.6, base.l) }))
}

function themeConfig() {
  const accent = cssVar('--accent', '#5ce1c6')
  const accent2 = cssVar('--accent-2', '#8ff0dc')
  const bg = cssVar('--bg', '#0a0e13')
  const bgSoft = cssVar('--bg-soft', '#0f141b')
  const ink = cssVar('--ink', '#dce4ec')
  const inkDim = cssVar('--ink-dim', '#a7b3bf')
  const mono = cssVar('--mono', 'ui-monospace, SFMono-Regular, Menlo, monospace')
  const a = parse(accent)
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: mono,
    themeVariables: {
      darkMode: true,
      background: bg,
      primaryColor: rgba(a, 0.16),
      primaryBorderColor: accent,
      primaryTextColor: ink,
      secondaryColor: rgba(parse(accent2), 0.14),
      secondaryBorderColor: accent2,
      secondaryTextColor: ink,
      tertiaryColor: bgSoft,
      tertiaryBorderColor: rgba(a, 0.35),
      tertiaryTextColor: ink,
      lineColor: rgba(a, 0.85),
      textColor: inkDim,
      mainBkg: rgba(a, 0.16),
      nodeBorder: accent,
      nodeTextColor: ink,
      clusterBkg: rgba(a, 0.05),
      clusterBorder: rgba(a, 0.32),
      titleColor: ink,
      edgeLabelBackground: bgSoft,
    },
  }
}

// give each node its own hue from the palette so stages stand out.
// uses lenient HTML parsing (a detached div) — mermaid's SVG isn't always
// strict-XML-clean, and a strict parser would choke and render an error box.
function colourize(svg, palette) {
  try {
    const holder = document.createElement('div')
    holder.innerHTML = svg
    const root = holder.querySelector('svg')
    if (!root) return svg
    root.querySelectorAll('g.node').forEach((n, i) => {
      const c = palette[i % palette.length]
      n.querySelectorAll('rect, polygon, circle, ellipse, path').forEach((s) => {
        s.style.stroke = rgba(c, 1)
        s.style.strokeWidth = '1.6px'
        s.style.fill = rgba(c, 0.14)
      })
    })
    return root.outerHTML
  } catch {
    return svg
  }
}

let diagramSeq = 0
export default function Mermaid({ code }) {
  const [svg, setSvg] = useState('')
  const [err, setErr] = useState(false)
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'control')

  // recolour diagrams live when the site theme is toggled
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'control')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    loadMermaid()
      .then((m) => {
        m.initialize(themeConfig())
        return m.render('mmd' + ++diagramSeq, code)
      })
      .then(({ svg }) => { if (!cancelled) setSvg(colourize(svg, buildPalette(cssVar('--accent', '#5ce1c6')))) })
      .catch(() => { if (!cancelled) setErr(true) })
    return () => { cancelled = true }
  }, [code, theme])

  if (err) return <pre className="asst-code">{code}</pre>
  if (!svg) return <div className="asst-diagram-loading">rendering diagram…</div>
  return <div className="asst-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
}
