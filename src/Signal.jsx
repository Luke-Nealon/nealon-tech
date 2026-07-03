import { useEffect, useState } from 'react'
import { signal, links } from './content.js'

// Same-origin path — CloudFront routes /signal/* to the nealon-signal Function URL. Double opt-in:
// this only creates a pending row + sends a confirmation email; nothing is added to the list until
// the recipient clicks the link in that email.
const SUBSCRIBE_URL = '/signal/subscribe'

export default function SignalPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | loading | success | already | error

  useEffect(() => {
    document.title = 'Signal — Luke Nealon'
    return () => { document.title = 'Luke Nealon — Technology, Data & AI Executive' }
  }, [])

  async function subscribe(e) {
    e.preventDefault()
    const addr = email.trim()
    if (!addr || state === 'loading') return
    setState('loading')
    try {
      const res = await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: addr }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setState('error'); return }
      setState(data.already ? 'already' : 'success')
      setEmail('')
    } catch { setState('error') }
  }

  const done = state === 'success' || state === 'already'

  return (
    <section className="sec wrap" id="signal">
      <span className="sec-ghost" aria-hidden="true">✦</span>
      <div className="sec-head reveal in">
        <span className="idx">Signal</span>
        <h1>{signal.title}</h1>
      </div>
      <p className="lede reveal in">{signal.lede}</p>

      <ul className="signal-points reveal in">
        {signal.points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>

      {done ? (
        <p className="signal-done reveal in">{state === 'already' ? signal.already : signal.success}</p>
      ) : (
        <form className="signal-form reveal in" onSubmit={subscribe}>
          <input
            type="email"
            className="signal-input"
            placeholder={signal.placeholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === 'loading'}
            aria-label="Email address"
            required
          />
          <button type="submit" disabled={state === 'loading' || !email.trim()}>
            {state === 'loading' ? signal.submitting : signal.submit}
          </button>
        </form>
      )}
      {state === 'error' && (
        <p className="signal-error reveal in">
          {signal.error} <a href={`mailto:${links.email}`}>{links.email}</a>
        </p>
      )}
    </section>
  )
}
