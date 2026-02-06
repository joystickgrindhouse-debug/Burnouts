import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import BurnoutsSelection from './BurnoutsSelection'
import BurnoutsApp from './BurnoutsApp'
import { auth } from './firebase'
import { signInWithCustomToken } from 'firebase/auth'

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleMessage = async (event) => {
      // Security: Check origin if needed, but for now allow message-based auth
      if (event.data.type === 'HUB_AUTH') {
        const { token, userData } = event.data;
        if (token) {
          try {
            await signInWithCustomToken(auth, token);
            console.log("Authenticated via Hub token");
          } catch (error) {
            console.error("Hub auth error:", error);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Add class to body if in iframe
    if (window.parent !== window) {
      document.body.classList.add('in-iframe');
    }
    
    // Check URL params for token as fallback
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      signInWithCustomToken(auth, token)
        .then(() => console.log("Authenticated via URL token"))
        .catch(err => console.error("URL token auth error:", err));
    }

    setIsReady(true);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isReady) return <div className="loading">Initializing Burnouts...</div>;

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
