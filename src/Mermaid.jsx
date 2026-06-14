import { useEffect, useState } from 'react'

// lazy-load mermaid only when a diagram actually appears
let mermaidPromise = null
export function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      mod.default.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' })
      return mod.default
    })
  }
  return mermaidPromise
}

let diagramSeq = 0
export default function Mermaid({ code }) {
  const [svg, setSvg] = useState('')
  const [err, setErr] = useState(false)
  useEffect(() => {
    let cancelled = false
    getMermaid()
      .then((m) => m.render('mmd' + ++diagramSeq, code))
      .then(({ svg }) => { if (!cancelled) setSvg(svg) })
      .catch(() => { if (!cancelled) setErr(true) })
    return () => { cancelled = true }
  }, [code])
  if (err) return <pre className="asst-code">{code}</pre>
  if (!svg) return <div className="asst-diagram-loading">rendering diagram…</div>
  return <div className="asst-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
}
