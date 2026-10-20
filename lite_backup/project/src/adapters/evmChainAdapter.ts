import type { ChainAdapter, BalanceResult } from '../adapters/types';
import { discoverEvmAssets } from '@/discovery/evmDiscovery';
import { getNetwork, getNetworksByEngine } from '@/registry/networkRegistry';
import { isClaimAsset } from '@/claim/fiveAssetScope';

export class EvmChainAdapter implements ChainAdapter {
  readonly engine = 'EVM' as const;
  readonly networkId: string;

  constructor(networkId: string) {
    this.networkId = networkId;
  }

  validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  async getBalance(address: string): Promise<BalanceResult[]> {
    const netDef = getNetwork(this.networkId);
    if (!netDef || netDef.engine !== 'EVM') return [];

    const rpcUrl = this.getRpcUrl();
    if (!rpcUrl) return [];

    try {
      const discovered = await discoverEvmAssets(address, this.networkId, rpcUrl);
      return discovered.map((d) => ({
        asset: d.symbol,
        network: d.network,
        rawAmount: d.rawAmount,
        decimals: d.decimals,
        contractAddress: d.contractAddress,
        standard: d.standard,
        usdValue: null,
      }));
    } catch {
      return [];
    }
  }

  private getRpcUrl(): string | null {
    const netDef = getNetwork(this.networkId);
    if (!netDef) return null;
    const envVal = (import.meta as any).env?.[netDef.rpcUrlEnv];
    if (envVal) return envVal;
    const fallbacks: Record<string, string> = {
      ethereum: 'https://eth.llamarpc.com',
      base: 'https://mainnet.base.org',
      arbitrum: 'https://arb1.arbitrum.io/rpc',
      optimism: 'https://mainnet.optimism.io',
      polygon: 'https://polygon-rpc.com',
      bsc: 'https://bsc-dataseed.binance.org',
      avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    };
    return fallbacks[this.networkId] ?? null;
  }
}

export function getAllEvmChainAdapters(): EvmChainAdapter[] {
  return getNetworksByEngine('EVM').map((n) => new EvmChainAdapter(n.id));
}

export function getEvmChainAdapter(networkId: string): EvmChainAdapter | null {
  const netDef = getNetwork(networkId);
  if (!netDef || netDef.engine !== 'EVM') return null;
  return new EvmChainAdapter(networkId);
}
