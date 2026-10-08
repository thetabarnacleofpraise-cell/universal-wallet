import type { ChainAdapter, BalanceResult } from '../adapters/types';
import { discoverBtcAssets } from '@/discovery/btcDiscovery';
import { getNetwork } from '@/registry/networkRegistry';

export class BitcoinChainAdapter implements ChainAdapter {
  readonly engine = 'BTC' as const;
  readonly networkId = 'bitcoin';

  validateAddress(address: string): boolean {
    return /^(bc1[a-z0-9]{39,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/i.test(address);
  }

  async getBalance(address: string): Promise<BalanceResult[]> {
    if (!this.validateAddress(address)) return [];

    const apiUrl = this.getApiUrl();
    if (!apiUrl) return [];

    try {
      const discovered = await discoverBtcAssets(address, apiUrl);
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

  private getApiUrl(): string {
    const netDef = getNetwork('bitcoin');
    const envVal = (import.meta as any).env?.[netDef?.rpcUrlEnv ?? ''];
    if (envVal) return envVal;
    return 'https://blockchain.info';
  }
}

export function getBitcoinChainAdapter(): BitcoinChainAdapter {
  return new BitcoinChainAdapter();
}
