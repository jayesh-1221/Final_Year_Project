import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="page">
      <header className="pageHeader">
        <h1>Emotion Detection</h1>
        <p className="muted">
          Choose a mode to analyze emotion from text, audio, or both.
        </p>
      </header>

      <div className="grid">
        <Link className="card" to="/text-emotion">
          <h2>Text Emotion</h2>
          <p className="muted">Paste text and detect the emotion.</p>
        </Link>

        <Link className="card" to="/audio-emotion">
          <h2>Audio Emotion</h2>
          <p className="muted">Upload or record audio and detect emotion.</p>
        </Link>

        <Link className="card" to="/combined-emotion">
          <h2>Combined</h2>
          <p className="muted">
            Use text + audio together for a combined result.
          </p>
        </Link>
      </div>
    </div>
  )
}

