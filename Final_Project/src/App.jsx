import './App.css'
import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import TextEmotion from './pages/TextEmotion.jsx'
import AudioEmotion from './pages/AudioEmotion.jsx'
import CombinedEmotion from './pages/CombinedEmotion.jsx'

function App() {
  return (
    <div className="appShell">
      <div className="topbar">
        <div className="brand"></div>
        <nav className="nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/text-emotion">Text</NavLink>
          <NavLink to="/audio-emotion">Audio</NavLink>
          <NavLink to="/combined-emotion">Combined</NavLink>
        </nav>
      </div>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/text-emotion" element={<TextEmotion />} />
          <Route path="/audio-emotion" element={<AudioEmotion />} />
          <Route path="/combined-emotion" element={<CombinedEmotion />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
