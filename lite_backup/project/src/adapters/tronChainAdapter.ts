import type { ChainAdapter, BalanceResult } from '../adapters/types';
import { discoverTronAssets } from '@/discovery/tronDiscovery';
import { getNetwork } from '@/registry/networkRegistry';

export class TronChainAdapter implements ChainAdapter {
  readonly engine = 'TRON' as const;
  readonly networkId = 'tron';

  validateAddress(address: string): boolean {
    return /^T[A-Za-z0-9]{33}$/.test(address);
  }

  async getBalance(address: string): Promise<BalanceResult[]> {
    if (!this.validateAddress(address)) return [];

    const rpcUrl = this.getRpcUrl();
    if (!rpcUrl) return [];

    try {
      const discovered = await discoverTronAssets(address, rpcUrl);
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

  private getRpcUrl(): string {
    const netDef = getNetwork('tron');
    const envVal = (import.meta as any).env?.[netDef?.rpcUrlEnv ?? ''];
    if (envVal) return envVal;
    return 'https://api.trongrid.io';
  }
}

export function getTronChainAdapter(): TronChainAdapter {
  return new TronChainAdapter();
}
