export type NetworkEngine = 'EVM' | 'TRON' | 'BTC' | 'SOLANA' | 'TON';

export interface NetworkDefinition {
  id: string;
  chainId: number | null;
  name: string;
  engine: NetworkEngine;
  nativeAsset: string;
  rpcUrlEnv: string;
  explorerUrl: string;
}

const NETWORKS: Record<string, NetworkDefinition> = {
  ethereum: {
    id: 'ethereum',
    chainId: 1,
    name: 'Ethereum',
    engine: 'EVM',
    nativeAsset: 'ETH',
    rpcUrlEnv: 'ALCHEMY_ETHEREUM_RPC_URL',
    explorerUrl: 'https://etherscan.io',
  },
  base: {
    id: 'base',
    chainId: 8453,
    name: 'Base',
    engine: 'EVM',
    nativeAsset: 'ETH',
    rpcUrlEnv: 'ALCHEMY_BASE_RPC_URL',
    explorerUrl: 'https://basescan.org',
  },
  arbitrum: {
    id: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum One',
    engine: 'EVM',
    nativeAsset: 'ETH',
    rpcUrlEnv: 'ALCHEMY_ARBITRUM_RPC_URL',
    explorerUrl: 'https://arbiscan.io',
  },
  optimism: {
    id: 'optimism',
    chainId: 10,
    name: 'Optimism',
    engine: 'EVM',
    nativeAsset: 'ETH',
    rpcUrlEnv: 'ALCHEMY_OPTIMISM_RPC_URL',
    explorerUrl: 'https://optimistic.etherscan.io',
  },
  polygon: {
    id: 'polygon',
    chainId: 137,
    name: 'Polygon',
    engine: 'EVM',
    nativeAsset: 'POL',
    rpcUrlEnv: 'ALCHEMY_POLYGON_RPC_URL',
    explorerUrl: 'https://polygonscan.com',
  },
  bsc: {
    id: 'bsc',
    chainId: 56,
    name: 'BNB Smart Chain',
    engine: 'EVM',
    nativeAsset: 'BNB',
    rpcUrlEnv: 'ALCHEMY_BSC_RPC_URL',
    explorerUrl: 'https://bscscan.com',
  },
  avalanche: {
    id: 'avalanche',
    chainId: 43114,
    name: 'Avalanche C-Chain',
    engine: 'EVM',
    nativeAsset: 'AVAX',
    rpcUrlEnv: 'ALCHEMY_AVALANCHE_RPC_URL',
    explorerUrl: 'https://snowtrace.io',
  },
  tron: {
    id: 'tron',
    chainId: null,
    name: 'TRON',
    engine: 'TRON',
    nativeAsset: 'TRX',
    rpcUrlEnv: 'TRON_RPC_URL',
    explorerUrl: 'https://tronscan.org',
  },
  bitcoin: {
    id: 'bitcoin',
    chainId: null,
    name: 'Bitcoin',
    engine: 'BTC',
    nativeAsset: 'BTC',
    rpcUrlEnv: 'BTC_API_URL',
    explorerUrl: 'https://blockchain.info',
  },
  solana: {
    id: 'solana',
    chainId: null,
    name: 'Solana',
    engine: 'SOLANA',
    nativeAsset: 'SOL',
    rpcUrlEnv: 'SOLANA_RPC_URL',
    explorerUrl: 'https://solscan.io',
  },
  ton: {
    id: 'ton',
    chainId: null,
    name: 'TON',
    engine: 'TON',
    nativeAsset: 'TON',
    rpcUrlEnv: 'TON_RPC_URL',
    explorerUrl: 'https://tonscan.org',
  },
};

export function getNetwork(id: string): NetworkDefinition | undefined {
  return NETWORKS[id];
}

export function getNetworkByChainId(chainId: number): NetworkDefinition | undefined {
  return Object.values(NETWORKS).find((n) => n.chainId === chainId);
}

export function getAllNetworks(): NetworkDefinition[] {
  return Object.values(NETWORKS);
}

export function getEvmNetworks(): NetworkDefinition[] {
  return Object.values(NETWORKS).filter((n) => n.engine === 'EVM');
}

export function getNetworksByEngine(engine: NetworkEngine): NetworkDefinition[] {
  return Object.values(NETWORKS).filter((n) => n.engine === engine);
}

export function getNetworkIds(): string[] {
  return Object.keys(NETWORKS);
}
