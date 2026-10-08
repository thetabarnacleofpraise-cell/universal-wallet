import type { RouteRequest, RouteResult, ChainEngine } from '../adapters/types';
import { walletController } from '../wallet/walletController';
import { getEvmChainAdapter, getAllEvmChainAdapters } from '../adapters/evmChainAdapter';
import { getSolanaChainAdapter } from '../adapters/solanaChainAdapter';
import { getTronChainAdapter } from '../adapters/tronChainAdapter';
import { getBitcoinChainAdapter } from '../adapters/bitcoinChainAdapter';
import { getTonChainAdapter } from '../adapters/tonChainAdapter';
import { getNetwork } from '@/registry/networkRegistry';
import { isClaimAsset } from '@/claim/fiveAssetScope';
import type { ChainAdapter, BalanceResult, DiscoveredAssetInternal } from '../adapters/types';

export class UniversalRouter {
  routeOperation(req: RouteRequest): RouteResult {
    if (req.sourceType === 'cex') {
      return {
        adapterId: `cex:${req.source}`,
        adapterType: 'cex',
        engine: this.getEngineForNetwork(req.network),
        handled: true,
      };
    }

    const engine = this.getEngineForNetwork(req.network);
    return {
      adapterId: `wallet:${req.source}:${engine}`,
      adapterType: 'wallet',
      engine,
      handled: true,
    };
  }

  getEngineForNetwork(networkId: string): ChainEngine {
    const netDef = getNetwork(networkId);
    if (!netDef) throw new Error(`Unknown network: ${networkId}`);
    return netDef.engine as ChainEngine;
  }

  getChainAdapter(networkId: string): ChainAdapter | null {
    const netDef = getNetwork(networkId);
    if (!netDef) return null;

    switch (netDef.engine) {
      case 'EVM':
        return getEvmChainAdapter(networkId);
      case 'SOLANA':
        return getSolanaChainAdapter();
      case 'TRON':
        return getTronChainAdapter();
      case 'BTC':
        return getBitcoinChainAdapter();
      case 'TON':
        return getTonChainAdapter();
      default:
        return null;
    }
  }

  async discoverAll(address: string): Promise<DiscoveredAssetInternal[]> {
    const allBalances: BalanceResult[] = [];

    const evmAdapters = getAllEvmChainAdapters();
    for (const adapter of evmAdapters) {
      try {
        const balances = await adapter.getBalance(address);
        allBalances.push(...balances);
      } catch {}
    }

    const solana = getSolanaChainAdapter();
    try { allBalances.push(...await solana.getBalance(address)); } catch {}

    const tron = getTronChainAdapter();
    try { allBalances.push(...await tron.getBalance(address)); } catch {}

    const btc = getBitcoinChainAdapter();
    try { allBalances.push(...await btc.getBalance(address)); } catch {}

    const ton = getTonChainAdapter();
    try { allBalances.push(...await ton.getBalance(address)); } catch {}

    return allBalances.map((b) => ({
      assetId: `${b.asset}-${b.network}`,
      symbol: b.asset,
      network: b.network,
      rawAmount: b.rawAmount,
      decimals: b.decimals,
      standard: b.standard,
      contractAddress: b.contractAddress,
      usdValue: b.usdValue,
      source: address,
      claimEligible: isClaimAsset(b.asset),
      claimInScope: isClaimAsset(b.asset),
    }));
  }

  discoverClaimableOnly(address: string): Promise<DiscoveredAssetInternal[]> {
    return this.discoverAll(address).then((all) => all.filter((a) => a.claimInScope));
  }

  getWalletTypeForNetwork(networkId: string): 'evm' | 'solana' | 'tron' | 'bitcoin' | 'ton' | null {
    const engine = this.getEngineForNetwork(networkId);
    switch (engine) {
      case 'EVM': return 'evm';
      case 'SOLANA': return 'solana';
      case 'TRON': return 'tron';
      case 'BTC': return 'bitcoin';
      case 'TON': return 'ton';
      default: return null;
    }
  }
}

export const universalRouter = new UniversalRouter();
