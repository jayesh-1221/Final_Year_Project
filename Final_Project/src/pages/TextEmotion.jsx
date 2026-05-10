import { useState } from 'react'
import { apiClient } from '../api/client'

export default function TextEmotion() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    setError('')
    setResult(null)
    setLoading(true)
    try {
      const { data } = await apiClient.post('/api/text/analyze', {
        text: trimmed,
      })
      setResult({
        emotion: data.emotion ?? 'Neutral',
        confidence:
          typeof data.confidence === 'number' ? data.confidence : Number(data.confidence) || 0,
      })
    } catch (err) {
      const msg =
        err?.response?.data?.error ??
        (err instanceof Error ? err.message : 'Request failed')
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  function clearAll() {
    setText('')
    setResult(null)
    setError('')
  }

  const confidencePct =
    result != null ? Math.round(result.confidence * 100) : null

  return (
    <div className="page">
      <header className="pageHeader">
        <h1>Text Emotion</h1>
        <p className="muted">
         
          <code></code>.
        </p>
      </header>

      <form className="panel" onSubmit={handleSubmit}>
        <label className="label" htmlFor="emotionText">
          Text input
        </label>
        <textarea
          id="emotionText"
          className="textarea"
          rows={7}
          placeholder="Type or paste text here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="row">
          <button className="btn" type="submit" disabled={!text.trim() || loading}>
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={clearAll}
            disabled={(!text && !result && !error) || loading}
          >
            Clear
          </button>
        </div>
      </form>

      <section className="panel">
        <h2>Result</h2>
        {loading ? <p className="muted">Analyzing…</p> : null}
        {error ? <p className="muted">{error}</p> : null}
        {result ? (
          <div className="result">
            <div className="pill">{result.emotion}</div>
            <p className="muted">Confidence: {confidencePct}%</p>
          </div>
        ) : null}
        {!result && !error && !loading ? (
          <p className="muted">Submit text to see a result.</p>
        ) : null}
      </section>
    </div>
  )
}
