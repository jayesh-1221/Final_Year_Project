import { useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '../api/client'

/** Multipart field name — must match `uploadAudio.single('audio')` on the server. */
const AUDIO_FORM_FIELD = 'audio'

export default function AudioEmotion() {
  const [file, setFile] = useState(null)
  const [recordError, setRecordError] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState('')
  const [result, setResult] = useState(null)
  const [analyzeError, setAnalyzeError] = useState('')
  const [loading, setLoading] = useState(false)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  const meta = useMemo(() => {
    if (!file) return null
    return {
      name: file.name,
      type: file.type || 'unknown',
      sizeKb: Math.round(file.size / 1024),
    }
  }, [file])

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
        setFile(recordedFile)

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

  function clearAll() {
    setFile(null)
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

  async function analyzeAudio() {
    if (!file) return
    setAnalyzeError('')
    setResult(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append(AUDIO_FORM_FIELD, file, file.name || 'audio.webm')
      const { data } = await apiClient.post('/api/audio/analyze', form)
      setResult({
        emotion: data.emotion ?? 'Neutral',
        confidence:
          typeof data.confidence === 'number'
            ? data.confidence
            : Number(data.confidence) || 0,
        transcript: typeof data.transcript === 'string' ? data.transcript : '',
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

  async function reRecord() {
    clearAll()
    await startRecording()
  }

  return (
    <div className="page">
      <header className="pageHeader">
        <h1>Audio Emotion</h1>
        <p className="muted">
          
          <code></code>
        </p>
      </header>

      <section className="panel">
        <h2>Audio input</h2>
        <div className="row" style={{ marginBottom: 12 }}>
          {!isRecording ? (
            <button className="btn" type="button" onClick={startRecording}>
              Start recording
            </button>
          ) : (
            <button className="btn" type="button" onClick={stopRecording}>
              Stop recording
            </button>
          )}
          {!isRecording && (recordingUrl || file) ? (
            <button className="btn secondary" type="button" onClick={reRecord}>
              Re-record
            </button>
          ) : null}
          <button
            className="btn secondary"
            type="button"
            onClick={clearAll}
            disabled={!file && !recordingUrl && !recordError && !isRecording}
          >
            Clear
          </button>
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

        <label className="label" htmlFor="audioFile">
          Audio file
        </label>
        <input
          id="audioFile"
          className="input"
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null
            setFile(next)
            setRecordError('')
            setResult(null)
            setAnalyzeError('')
            if (recordingUrl) {
              URL.revokeObjectURL(recordingUrl)
              setRecordingUrl('')
            }
          }}
        />

        {meta ? (
          <div className="result">
            <div className="kv">
              <div>
                <div className="muted">Filename</div>
                <div>{meta.name}</div>
              </div>
              <div>
                <div className="muted">Type</div>
                <div>{meta.type}</div>
              </div>
              <div>
                <div className="muted">Size</div>
                <div>{meta.sizeKb} KB</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">Choose a file to preview details.</p>
        )}

        <div className="row">
          <button
            className="btn"
            type="button"
            disabled={!file || loading}
            onClick={analyzeAudio}
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Result</h2>
        {loading ? <p className="muted">Analyzing…</p> : null}
        {analyzeError ? <p className="muted">{analyzeError}</p> : null}
        {result ? (
          <div className="result">
            <div className="pill">{result.emotion}</div>
            <p className="muted">
              Confidence: {Math.round(result.confidence * 100)}%
            </p>
            {result.transcript ? (
              <div style={{ marginTop: 12 }}>
                <div className="muted" style={{ marginBottom: 8 }}>
                  Transcript
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {result.transcript}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        {!result && !analyzeError && !loading ? (
          <p className="muted">Run analyze to see emotion and transcript.</p>
        ) : null}
      </section>
    </div>
  )
}

