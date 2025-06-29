import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import DrainerHero from './components/Drainer';
import Connect from './components/connectwallet'; 
import SolanaConnect from './components/SolanaConnect'; 


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DrainerHero />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/solana" element={<SolanaConnect />} />
      </Routes>
    </Router>
  );
}

export default App;
