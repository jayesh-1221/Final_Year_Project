import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../api/client'

/** Multipart field name — must match `uploadAudio.single('audio')` on the server. */
const AUDIO_FORM_FIELD = 'audio'

export default function CombinedEmotion() {
  const [text, setText] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [recordError, setRecordError] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState('')
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  const [result, setResult] = useState(null)
  const [analyzeError, setAnalyzeError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    return () => {
      if (recordingUrl) URL.revokeObjectURL(recordingUrl)
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop()
      }
    }
  }, [recordingUrl])

  async function startRecording() {
    setRecordError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setRecordError('Recording is not supported in this browser.')
        return
      }

      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl)
        setRecordingUrl('')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        const url = URL.createObjectURL(blob)
        setRecordingUrl(url)
        setResult(null)
        setAnalyzeError('')

        const ext = blob.type.includes('ogg')
          ? 'ogg'
          : blob.type.includes('mp4')
            ? 'm4a'
            : 'webm'
        const recordedFile = new File([blob], `recording.${ext}`, {
          type: blob.type || 'audio/webm',
        })
        setAudioFile(recordedFile)

        if (streamRef.current) {
          for (const t of streamRef.current.getTracks()) t.stop()
        }
        streamRef.current = null
        mediaRecorderRef.current = null
        chunksRef.current = []
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not start recording.'
      setRecordError(msg)
      setIsRecording(false)
    }
  }

  function stopRecording() {
    setRecordError('')
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    try {
      recorder.stop()
    } finally {
      setIsRecording(false)
    }
  }

  function clearAudio() {
    setAudioFile(null)
    setRecordError('')
    setResult(null)
    setAnalyzeError('')
    setIsRecording(false)
    chunksRef.current = []
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop()
      streamRef.current = null
    }
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    setRecordingUrl('')
  }

  async function reRecord() {
    clearAudio()
    await startRecording()
  }

  async function analyzeCombined() {
    const trimmed = text.trim()
    if (!trimmed && !audioFile) return

    setAnalyzeError('')
    setResult(null)
    setLoading(true)
    try {
      const form = new FormData()
      if (trimmed) form.append('text', trimmed)
      if (audioFile) {
        form.append(AUDIO_FORM_FIELD, audioFile, audioFile.name || 'audio.webm')
      }

      const { data } = await apiClient.post('/api/combined/analyze', form)

      const normBlock = (block) => {
        if (!block || typeof block !== 'object') return null
        return {
          emotion: block.emotion ?? 'Neutral',
          confidence:
            typeof block.confidence === 'number'
              ? block.confidence
              : Number(block.confidence) || 0,
        }
      }

      const combinedRaw = data.combined
      const combined =
        combinedRaw && typeof combinedRaw === 'object'
          ? {
              emotion: combinedRaw.emotion ?? 'Neutral',
              confidence:
                typeof combinedRaw.confidence === 'number'
                  ? combinedRaw.confidence
                  : Number(combinedRaw.confidence) || 0,
            }
          : null

      setResult({
        combined,
        text: normBlock(data.text),
        audio:
          data.audio && typeof data.audio === 'object'
            ? {
                ...normBlock(data.audio),
                transcript:
                  typeof data.audio.transcript === 'string'
                    ? data.audio.transcript
                    : '',
              }
            : null,
      })
    } catch (err) {
      const msg =
        err?.response?.data?.error ??
        (err instanceof Error ? err.message : 'Request failed')
      setAnalyzeError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  function clearAll() {
    setText('')
    clearAudio()
    setResult(null)
    setAnalyzeError('')
  }

  return (
    <div className="page">
      <header className="pageHeader">
        <h1>Combined Emotion</h1>
        <p className="muted">
          Provide both text and audio to compute a combined result.
        </p>
      </header>

      <section className="panel">
        <div className="grid2">
          <div>
            <label className="label" htmlFor="combinedText">
              Text
            </label>
            <textarea
              id="combinedText"
              className="textarea"
              rows={6}
              placeholder="Paste text…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="combinedAudio">
              Audio
            </label>
            <div className="row" style={{ marginBottom: 10 }}>
              {!isRecording ? (
                <button className="btn" type="button" onClick={startRecording}>
                  Start recording
                </button>
              ) : (
                <button className="btn" type="button" onClick={stopRecording}>
                  Stop recording
                </button>
              )}
              {!isRecording && (recordingUrl || audioFile) ? (
                <button className="btn secondary" type="button" onClick={reRecord}>
                  Re-record
                </button>
              ) : null}
              {isRecording ? <div className="pill">Recording…</div> : null}
            </div>

            {recordError ? <p className="muted">{recordError}</p> : null}
            {recordingUrl ? (
              <div style={{ marginBottom: 12 }}>
                <div className="muted" style={{ marginBottom: 8 }}>
                  Preview
                </div>
                <audio controls src={recordingUrl} style={{ width: '100%' }} />
              </div>
            ) : null}

            <input
              id="combinedAudio"
              className="input"
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null
                setAudioFile(next)
                setRecordError('')
                setResult(null)
                setAnalyzeError('')
                if (recordingUrl) {
                  URL.revokeObjectURL(recordingUrl)
                  setRecordingUrl('')
                }
              }}
            />

            <div className="muted" style={{ marginTop: 10 }}>
              {audioFile ? `Selected: ${audioFile.name}` : 'No file selected.'}
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 16 }}>
          <button
            className="btn"
            type="button"
            disabled={(!text.trim() && !audioFile) || loading}
            onClick={analyzeCombined}
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={clearAll}
            disabled={
              (!text && !audioFile && !recordingUrl && !recordError && !isRecording && !result && !analyzeError) ||
              loading
            }
          >
            Clear
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Result</h2>
        {loading ? <p className="muted">Analyzing…</p> : null}
        {analyzeError ? <p className="muted">{analyzeError}</p> : null}
        {result?.combined ? (
          <div className="result">
            <div className="pill">{result.combined.emotion}</div>
            <p className="muted">
              Confidence: {Math.round(result.combined.confidence * 100)}%
            </p>
            <div className="kv" style={{ marginTop: 12 }}>
              <div>
                <div className="muted">Text</div>
                {result.text ? (
                  <>
                    <div>{result.text.emotion}</div>
                    <div className="muted" style={{ fontSize: '0.9em' }}>
                      {Math.round(result.text.confidence * 100)}% confidence
                    </div>
                  </>
                ) : (
                  <div>—</div>
                )}
              </div>
              <div>
                <div className="muted">Audio</div>
                {result.audio ? (
                  <>
                    <div>{result.audio.emotion}</div>
                    <div className="muted" style={{ fontSize: '0.9em' }}>
                      {Math.round(result.audio.confidence * 100)}% confidence
                    </div>
                  </>
                ) : (
                  <div>—</div>
                )}
              </div>
            </div>
            {result.audio?.transcript ? (
              <div style={{ marginTop: 12 }}>
                <div className="muted" style={{ marginBottom: 8 }}>
                  Transcript
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {result.audio.transcript}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        {!result?.combined && !analyzeError && !loading ? (
          <p className="muted">Run analyze to see combined text and audio results.</p>
        ) : null}
      </section>
    </div>
  )
}

