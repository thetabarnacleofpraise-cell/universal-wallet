import { describe, it, expect } from 'vitest';
import {
  isClaimAsset,
  filterClaimAssets,
  getClaimAssets,
  getClaimAssetsForNetwork,
  CLAIM_ASSET_SYMBOLS,
} from '@/claim/fiveAssetScope';
import { getAllAssets } from '@/registry/assetRegistry';

describe('claimAssetScope', () => {
  it('includes exactly the six claim assets', () => {
    expect(CLAIM_ASSET_SYMBOLS).toEqual(['ETH', 'USDT', 'USDC', 'BNB', 'BTC', 'SOL']);
  });

  it('isClaimAsset returns true for in-scope assets (case-insensitive)', () => {
    expect(isClaimAsset('ETH')).toBe(true);
    expect(isClaimAsset('eth')).toBe(true);
    expect(isClaimAsset('USDT')).toBe(true);
    expect(isClaimAsset('USDC')).toBe(true);
    expect(isClaimAsset('BNB')).toBe(true);
    expect(isClaimAsset('BTC')).toBe(true);
    expect(isClaimAsset('SOL')).toBe(true);
  });

  it('isClaimAsset returns false for out-of-scope assets', () => {
    expect(isClaimAsset('DOGE')).toBe(false);
    expect(isClaimAsset('TRX')).toBe(false);
    expect(isClaimAsset('TON')).toBe(false);
    expect(isClaimAsset('SHIB')).toBe(false);
    expect(isClaimAsset('XRP')).toBe(false);
    expect(isClaimAsset('')).toBe(false);
  });

  it('filterClaimAssets keeps only in-scope assets', () => {
    const all = getAllAssets();
    const filtered = filterClaimAssets(all);
    for (const a of filtered) {
      expect(isClaimAsset(a.symbol)).toBe(true);
    }
  });

  it('getClaimAssets returns non-empty list', () => {
    const claimAssets = getClaimAssets();
    expect(claimAssets.length).toBeGreaterThan(0);
  });

  it('getClaimAssetsForNetwork filters by network', () => {
    const ethAssets = getClaimAssetsForNetwork('ethereum');
    for (const a of ethAssets) {
      expect(a.network).toBe('ethereum');
      expect(isClaimAsset(a.symbol)).toBe(true);
    }
  });
});
