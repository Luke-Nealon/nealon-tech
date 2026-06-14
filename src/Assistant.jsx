import { useEffect, useRef, useState } from 'react'
import Mermaid from './Mermaid.jsx'

const ENDPOINT = 'https://6xfeceqcoli6rmkxmcghytx5eq0lpqux.lambda-url.ap-southeast-2.on.aws/'

const MODELS = [
  { key: 'haiku', label: 'Claude Haiku 4.5' },
  { key: 'sonnet', label: 'Claude Sonnet 4.6' },
  { key: 'nova', label: 'Amazon Nova Lite' },
  { key: 'qwen', label: 'Qwen3 Coder' },
]

const SUGGESTIONS = [
  'When should I use an agent vs a workflow?',
  'Why does model independence matter?',
  'How are you built? Draw your architecture',
]

// split a reply into markdown + fenced code (```mermaid → diagram)
function parseSegments(text) {
  const segs = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: 'md', text: text.slice(last, m.index) })
    segs.push({ type: m[1] === 'mermaid' ? 'mermaid' : 'code', code: m[2].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ type: 'md', text: text.slice(last) })
  return segs
}

function renderMessage(text, streaming) {
  // while streaming, hide an unterminated code fence behind a placeholder
  let working = text
  let drawing = false
  if (streaming && ((text.match(/```/g) || []).length % 2 === 1)) {
    working = text.slice(0, text.lastIndexOf('```'))
    drawing = true
  }
  const segs = parseSegments(working)
  return (
    <>
      {segs.map((s, i) =>
        s.type === 'mermaid' ? <Mermaid key={i} code={s.code} />
          : s.type === 'code' ? <pre key={i} className="asst-code">{s.code}</pre>
          : <div key={i}>{renderRich(s.text)}</div>
      )}
      {drawing && <div className="asst-diagram-loading">drawing diagram…</div>}
    </>
  )
}

function sessionId() {
  let id = localStorage.getItem('assistant-session')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    localStorage.setItem('assistant-session', id)
  }
  return id
}

// minimal markdown → React: **bold**, "- " lists, blank-line paragraphs
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  )
}
function renderRich(text) {
  const blocks = []
  let list = null
  for (const raw of text.split('\n')) {
    const t = raw.trim()
    const m = t.match(/^[-*]\s+(.*)/)
    if (m) {
      if (!list) list = []
      list.push(m[1])
    } else {
      if (list) { blocks.push({ t: 'ul', items: list }); list = null }
      if (t) blocks.push({ t: 'p', text: t })
    }
  }
  if (list) blocks.push({ t: 'ul', items: list })
  return blocks.map((b, i) =>
    b.t === 'ul'
      ? <ul key={i}>{b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>
      : <p key={i}>{renderInline(b.text)}</p>
  )
}

export default function Assistant() {
  const [open, setOpen] = useState(false)
  const [full, setFull] = useState(false)
  const [consented, setConsented] = useState(() => localStorage.getItem('assistant-consent') === 'yes')
  const [model, setModel] = useState('haiku')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, busy, open])

  useEffect(() => {
    const openIt = () => setOpen(true)
    window.addEventListener('open-assistant', openIt)
    return () => window.removeEventListener('open-assistant', openIt)
  }, [])

  function accept() {
    localStorage.setItem('assistant-consent', 'yes')
    setConsented(true)
  }
  function revoke() {
    localStorage.removeItem('assistant-consent')
    setMessages([])
    setConsented(false)
  }

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || busy) return
    setInput('')
    const prior = messages.filter((m) => m.role === 'user' || m.role === 'assistant')
    const label = MODELS.find((m) => m.key === model)?.label
    setMessages((m) => [...m, { role: 'user', text: msg }, { role: 'assistant', text: '', model: label, streaming: true }])
    setBusy(true)
    const setLast = (patch) => setMessages((m) => {
      const c = [...m]
      c[c.length - 1] = { ...c[c.length - 1], ...patch }
      return c
    })
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId: sessionId(), model, history: prior.slice(-20) }),
      })
      if (!res.body) throw new Error('no stream')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      const MARK = '<<SOURCES>>'
      let acc = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += dec.decode(value, { stream: true })
        const i = acc.indexOf(MARK)
        setLast({ text: i >= 0 ? acc.slice(0, i) : acc })
      }
      const i = acc.indexOf(MARK)
      let sources = []
      if (i >= 0) { try { sources = JSON.parse(acc.slice(i + MARK.length)) } catch { /* ignore */ } }
      setLast({ text: (i >= 0 ? acc.slice(0, i) : acc).trim(), streaming: false, sources })
    } catch {
      setLast({ text: 'Network error — try again in a moment.', role: 'system', streaming: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        className={`asst-launch ${open ? 'hidden' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Open the AI assistant"
      >
        <span className="dot" aria-hidden="true" /> Ask me about applied AI
      </button>

      {open && (
        <div className={`asst-panel ${full ? 'asst-full' : ''}`} role="dialog" aria-label="AI assistant">
          <div className="asst-head">
            <div>
              <strong>Site assistant</strong>
              <span className="asst-sub">scoped · model-independent · cost-capped</span>
            </div>
            <div className="asst-head-btns">
              <button className="asst-icon" onClick={() => setFull((f) => !f)} aria-label={full ? 'Exit full screen' : 'Full screen'} title={full ? 'Exit full screen' : 'Full screen'}>
                {full ? '⤡' : '⤢'}
              </button>
              <button className="asst-icon" onClick={() => setOpen(false)} aria-label="Close" title="Close">×</button>
            </div>
          </div>

          {!consented ? (
            <div className="asst-consent">
              <p className="asst-consent-title">Before you start</p>
              <p>
                This is a live AI demo I built — it answers questions about applied AI grounded
                in my own articles (with sources linked), and can explain how it's built.
              </p>
              <p>
                Your messages are sent to AWS Bedrock to generate replies and aren't stored beyond
                an anonymous, expiring session counter used for rate limiting. No personal data is
                kept, and nothing is used to train models. The demo runs on a small daily budget,
                so usage is capped.
              </p>
              <p className="asst-fineprint">
                Compliance by design: the control is built into the flow, not bolted on after.
                Full detail in the <a href="/privacy.html" target="_blank" rel="noreferrer">privacy policy</a>.
              </p>
              <button className="asst-accept" onClick={accept}>I understand — start chatting</button>
            </div>
          ) : (
            <>
              <div className="asst-modelbar">
                <label htmlFor="asst-model">Model</label>
                <select id="asst-model" value={model} onChange={(e) => setModel(e.target.value)}>
                  {MODELS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <span className="asst-modelnote">switch anytime — the chat keeps going</span>
              </div>

              <div className="asst-log" ref={scrollRef}>
                {messages.length === 0 && (
                  <div className="asst-empty">
                    <p>Ask me about applied AI — answers come from my writing, with sources. Try:</p>
                    <div className="asst-suggest">
                      {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`asst-msg asst-${m.role}`}>
                    {m.role === 'assistant' && m.model && <span className="asst-badge">{m.model}</span>}
                    <div className="asst-bubble">
                      {m.role === 'assistant'
                        ? (m.text ? renderMessage(m.text, m.streaming) : <span className="asst-typing">…</span>)
                        : m.text}
                      {m.role === 'assistant' && m.streaming && m.text && <span className="asst-caret">▍</span>}
                    </div>
                    {m.role === 'assistant' && m.sources?.length > 0 && (
                      <div className="asst-sources">
                        <span className="asst-sources-label">Sources</span>
                        {m.sources.map((s) => (
                          <a key={s.slug} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <form className="asst-input" onSubmit={(e) => { e.preventDefault(); send() }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about this assistant…"
                  maxLength={1500}
                  disabled={busy}
                />
                <button type="submit" disabled={busy || !input.trim()}>Send</button>
              </form>
              <div className="asst-foot">
                <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy policy</a>
                <button className="asst-link" onClick={revoke}>Reset privacy choice</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
