import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import BurnoutsSelection from './BurnoutsSelection'
import BurnoutsApp from './BurnoutsApp'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/burnouts" replace />} />
        <Route path="/burnouts" element={<BurnoutsSelection />} />
        <Route path="/burnouts/:muscleGroup" element={<BurnoutsApp />} />
      </Routes>
    </Router>
  )
}

export default App
