import { useEffect, useRef, useState } from 'react'

const ENDPOINT = 'https://6xfeceqcoli6rmkxmcghytx5eq0lpqux.lambda-url.ap-southeast-2.on.aws/'

const MODELS = [
  { key: 'nova', label: 'Amazon Nova Lite' },
  { key: 'haiku', label: 'Claude Haiku 4.5' },
  { key: 'sonnet', label: 'Claude Sonnet 4.5' },
]

const SUGGESTIONS = [
  'How are you built?',
  'Are you locked to one AI vendor?',
  'How is my cost kept under control?',
]

function sessionId() {
  let id = localStorage.getItem('assistant-session')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    localStorage.setItem('assistant-session', id)
  }
  return id
}

export default function Assistant() {
  const [open, setOpen] = useState(false)
  const [consented, setConsented] = useState(() => localStorage.getItem('assistant-consent') === 'yes')
  const [model, setModel] = useState('nova')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, busy, open])

  function accept() {
    localStorage.setItem('assistant-consent', 'yes')
    setConsented(true)
  }

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || busy) return
    setInput('')
    const prior = messages.filter((m) => m.role === 'user' || m.role === 'assistant')
    setMessages([...messages, { role: 'user', text: msg }])
    setBusy(true)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          sessionId: sessionId(),
          model,
          history: prior.slice(-8),
        }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages((m) => [...m, { role: 'assistant', text: data.reply, model: data.model }])
      } else {
        setMessages((m) => [...m, { role: 'system', text: data.error || 'Something went wrong.' }])
      }
    } catch {
      setMessages((m) => [...m, { role: 'system', text: 'Network error — try again in a moment.' }])
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
        <span className="dot" aria-hidden="true" /> Ask how this site's AI works
      </button>

      {open && (
        <div className="asst-panel" role="dialog" aria-label="AI assistant">
          <div className="asst-head">
            <div>
              <strong>Site assistant</strong>
              <span className="asst-sub">scoped · model-independent · cost-capped</span>
            </div>
            <button className="asst-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          {!consented ? (
            <div className="asst-consent">
              <p className="asst-consent-title">Before you start</p>
              <p>
                This is a live AI demo I built — a scoped assistant that only explains its own
                architecture and my approach to applied AI.
              </p>
              <p>
                Your messages are sent to AWS Bedrock to generate replies and aren't stored beyond
                an anonymous, expiring session counter used for rate limiting. No personal data is
                kept. The demo runs on a small daily budget, so usage is capped.
              </p>
              <p className="asst-fineprint">
                Compliance by design: the control is built into the flow, not bolted on after.
              </p>
              <button className="asst-accept" onClick={accept}>I understand — start chatting</button>
            </div>
          ) : (
            <>
              <div className="asst-modelbar">
                <label htmlFor="asst-model">Model</label>
                <select
                  id="asst-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {MODELS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
                <span className="asst-modelnote">switch live — same framework</span>
              </div>

              <div className="asst-log" ref={scrollRef}>
                {messages.length === 0 && (
                  <div className="asst-empty">
                    <p>Ask me how I'm built, or try:</p>
                    <div className="asst-suggest">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} onClick={() => send(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`asst-msg asst-${m.role}`}>
                    {m.role === 'assistant' && m.model && (
                      <span className="asst-badge">{m.model}</span>
                    )}
                    <div className="asst-bubble">{m.text}</div>
                  </div>
                ))}
                {busy && <div className="asst-msg asst-assistant"><div className="asst-bubble asst-typing">…</div></div>}
              </div>

              <form
                className="asst-input"
                onSubmit={(e) => { e.preventDefault(); send() }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about this assistant…"
                  maxLength={1500}
                  disabled={busy}
                />
                <button type="submit" disabled={busy || !input.trim()}>Send</button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
