import { DiscoveredAsset } from '@/discovery/evmDiscovery';
import { TronDiscoveredAsset } from '@/discovery/tronDiscovery';
import { BtcDiscoveredAsset } from '@/discovery/btcDiscovery';
import { SolanaDiscoveredAsset } from '@/discovery/solanaDiscovery';
import { isClaimAsset } from '@/claim/fiveAssetScope';

export type UniversalAsset = DiscoveredAsset | TronDiscoveredAsset | BtcDiscoveredAsset | SolanaDiscoveredAsset;

export interface UniversalDiscoveryResult {
  assets: UniversalAsset[];
  totalNetworksChecked: number;
}

export function filterUniversalAssets(assets: UniversalAsset[]): UniversalAsset[] {
  return assets.filter((a) => isClaimAsset(a.symbol));
}

export function mergeDiscoveryResults(
  evmResults: DiscoveredAsset[][],
  tronResults: TronDiscoveredAsset[],
  btcResults: BtcDiscoveredAsset[],
  solanaResults: SolanaDiscoveredAsset[],
): UniversalAsset[] {
  const all = [
    ...evmResults.flat(),
    ...tronResults,
    ...btcResults,
    ...solanaResults,
  ];
  return filterUniversalAssets(all);
}
