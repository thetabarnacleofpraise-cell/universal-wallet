import type { ChainAdapter, BalanceResult } from '../adapters/types';
import { getNetwork } from '@/registry/networkRegistry';

export class TonChainAdapter implements ChainAdapter {
  readonly engine = 'TON' as const;
  readonly networkId = 'ton';

  validateAddress(address: string): boolean {
    return /^E[A-Za-z0-9_-]{46}$|^UQ[A-Za-z0-9_-]{46}$/.test(address);
  }

  async getBalance(address: string): Promise<BalanceResult[]> {
    if (!this.validateAddress(address)) return [];

    const rpcUrl = this.getRpcUrl();
    if (!rpcUrl) return [];

    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '1',
          jsonrpc: '2.0',
          method: 'getAccountState',
          params: { address },
        }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const balance = data?.result?.balance ?? 0;
      if (balance > 0) {
        return [{
          asset: 'TON',
          network: 'ton',
          rawAmount: String(balance),
          decimals: 9,
          contractAddress: null,
          standard: 'NATIVE',
          usdValue: null,
        }];
      }
    } catch {
      // TON is capability-support only, not in claim scope
    }
    return [];
  }

  private getRpcUrl(): string | null {
    const netDef = getNetwork('ton');
    if (!netDef) return null;
    const envVal = (import.meta as any).env?.[netDef.rpcUrlEnv];
    if (envVal) return envVal;
    return 'https://toncenter.com/api/v2/jsonRPC';
  }
}

export function getTonChainAdapter(): TonChainAdapter {
  return new TonChainAdapter();
}
