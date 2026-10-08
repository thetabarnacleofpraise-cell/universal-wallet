import type { ChainAdapter, BalanceResult } from '../adapters/types';
import { discoverSolanaAssets, isValidSolanaAddress } from '@/discovery/solanaDiscovery';
import { getNetwork } from '@/registry/networkRegistry';

export class SolanaChainAdapter implements ChainAdapter {
  readonly engine = 'SOLANA' as const;
  readonly networkId = 'solana';

  validateAddress(address: string): boolean {
    return isValidSolanaAddress(address);
  }

  async getBalance(address: string): Promise<BalanceResult[]> {
    if (!this.validateAddress(address)) return [];

    const rpcUrl = this.getRpcUrl();
    if (!rpcUrl) return [];

    try {
      const discovered = await discoverSolanaAssets(address, rpcUrl);
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
    const netDef = getNetwork('solana');
    const envVal = (import.meta as any).env?.[netDef?.rpcUrlEnv ?? ''];
    if (envVal) return envVal;
    return 'https://api.mainnet-beta.solana.com';
  }
}

export function getSolanaChainAdapter(): SolanaChainAdapter {
  return new SolanaChainAdapter();
}
