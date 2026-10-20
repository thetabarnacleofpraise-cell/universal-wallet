import { getAllAssets, AssetDefinition } from '@/registry/assetRegistry';

export const CLAIM_ASSET_SYMBOLS = ['ETH', 'USDT', 'USDC', 'BNB', 'BTC', 'SOL'] as const;
export type ClaimAssetSymbol = (typeof CLAIM_ASSET_SYMBOLS)[number];

export function claimAssetSymbols(): readonly string[] {
  return CLAIM_ASSET_SYMBOLS;
}

export function isClaimAsset(symbol: string): boolean {
  return (CLAIM_ASSET_SYMBOLS as readonly string[]).includes(symbol.toUpperCase());
}

export function filterClaimAssets(assets: AssetDefinition[]): AssetDefinition[] {
  return assets.filter((a) => isClaimAsset(a.symbol));
}

export function getClaimAssets(): AssetDefinition[] {
  return filterClaimAssets(getAllAssets());
}

export function getClaimAssetsForNetwork(networkId: string): AssetDefinition[] {
  return filterClaimAssets(getAllAssets().filter((a) => a.network === networkId));
}
