export type AssetStandard = 'NATIVE' | 'ERC20' | 'TRC20' | 'BTC' | 'SPL';
export type AssetEngine = 'EVM' | 'TRON' | 'BTC' | 'SOLANA';

export interface AssetDefinition {
  id: string;
  symbol: string;
  network: string;
  contractAddress: string | null;
  decimals: number;
  standard: AssetStandard;
  engine: AssetEngine;
}

const ASSETS: AssetDefinition[] = [
  // ETH native on EVM networks
  { id: 'eth-ethereum', symbol: 'ETH', network: 'ethereum', contractAddress: null, decimals: 18, standard: 'NATIVE', engine: 'EVM' },
  { id: 'eth-base', symbol: 'ETH', network: 'base', contractAddress: null, decimals: 18, standard: 'NATIVE', engine: 'EVM' },
  { id: 'eth-arbitrum', symbol: 'ETH', network: 'arbitrum', contractAddress: null, decimals: 18, standard: 'NATIVE', engine: 'EVM' },
  { id: 'eth-optimism', symbol: 'ETH', network: 'optimism', contractAddress: null, decimals: 18, standard: 'NATIVE', engine: 'EVM' },

  // USDT
  { id: 'usdt-ethereum', symbol: 'USDT', network: 'ethereum', contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, standard: 'ERC20', engine: 'EVM' },
  { id: 'usdt-bsc', symbol: 'USDT', network: 'bsc', contractAddress: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, standard: 'ERC20', engine: 'EVM' },
  { id: 'usdt-optimism', symbol: 'USDT', network: 'optimism', contractAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6, standard: 'ERC20', engine: 'EVM' },
  { id: 'usdt-avalanche', symbol: 'USDT', network: 'avalanche', contractAddress: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6, standard: 'ERC20', engine: 'EVM' },
  { id: 'usdt-tron', symbol: 'USDT', network: 'tron', contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6, standard: 'TRC20', engine: 'TRON' },

  // USDC
  { id: 'usdc-ethereum', symbol: 'USDC', network: 'ethereum', contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, standard: 'ERC20', engine: 'EVM' },
  { id: 'usdc-base', symbol: 'USDC', network: 'base', contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, standard: 'ERC20', engine: 'EVM' },
  { id: 'usdc-arbitrum', symbol: 'USDC', network: 'arbitrum', contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, standard: 'ERC20', engine: 'EVM' },
  { id: 'usdc-optimism', symbol: 'USDC', network: 'optimism', contractAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, standard: 'ERC20', engine: 'EVM' },
  { id: 'usdc-polygon', symbol: 'USDC', network: 'polygon', contractAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, standard: 'ERC20', engine: 'EVM' },
  { id: 'usdc-avalanche', symbol: 'USDC', network: 'avalanche', contractAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6, standard: 'ERC20', engine: 'EVM' },

  // BNB native on BSC
  { id: 'bnb-bsc', symbol: 'BNB', network: 'bsc', contractAddress: null, decimals: 18, standard: 'NATIVE', engine: 'EVM' },

  // BTC native on Bitcoin
  { id: 'btc-bitcoin', symbol: 'BTC', network: 'bitcoin', contractAddress: null, decimals: 8, standard: 'BTC', engine: 'BTC' },

  // SOL native on Solana
  { id: 'sol-solana', symbol: 'SOL', network: 'solana', contractAddress: null, decimals: 9, standard: 'NATIVE', engine: 'SOLANA' },
];

export function getAllAssets(): AssetDefinition[] {
  return ASSETS;
}

export function getAssetsForNetwork(networkId: string): AssetDefinition[] {
  return ASSETS.filter((a) => a.network === networkId);
}

export function getAsset(id: string): AssetDefinition | undefined {
  return ASSETS.find((a) => a.id === id);
}

export function getAssetsBySymbol(symbol: string): AssetDefinition[] {
  return ASSETS.filter((a) => a.symbol === symbol);
}

export function getAssetByContract(networkId: string, contractAddress: string): AssetDefinition | undefined {
  return ASSETS.find((a) => a.network === networkId && a.contractAddress?.toLowerCase() === contractAddress.toLowerCase());
}
