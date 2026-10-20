import { describe, it, expect } from 'vitest';
import { getAllAssets, getAssetsForNetwork, getAsset, getAssetsBySymbol, getAssetByContract } from '@/registry/assetRegistry';

describe('assetRegistry', () => {
  it('has ETH on multiple EVM networks', () => {
    const ethAssets = getAssetsBySymbol('ETH');
    expect(ethAssets.length).toBeGreaterThanOrEqual(4);
    expect(ethAssets.some((a) => a.network === 'ethereum')).toBe(true);
    expect(ethAssets.some((a) => a.network === 'base')).toBe(true);
  });

  it('has USDT on BSC with correct contract', () => {
    const usdtBsc = getAssetByContract('bsc', '0x55d398326f99059fF775485246999027B3197955');
    expect(usdtBsc).toBeDefined();
    expect(usdtBsc?.symbol).toBe('USDT');
    expect(usdtBsc?.decimals).toBe(18);
  });

  it('has USDT on TRON with TRC20 standard', () => {
    const usdtTron = getAsset('usdt-tron');
    expect(usdtTron).toBeDefined();
    expect(usdtTron?.standard).toBe('TRC20');
    expect(usdtTron?.engine).toBe('TRON');
  });

  it('has SOL on Solana', () => {
    const sol = getAsset('sol-solana');
    expect(sol).toBeDefined();
    expect(sol?.symbol).toBe('SOL');
    expect(sol?.decimals).toBe(9);
  });

  it('has BTC on Bitcoin', () => {
    const btc = getAsset('btc-bitcoin');
    expect(btc).toBeDefined();
    expect(btc?.symbol).toBe('BTC');
    expect(btc?.decimals).toBe(8);
  });

  it('getAssetsForNetwork returns network-specific assets', () => {
    const bscAssets = getAssetsForNetwork('bsc');
    expect(bscAssets.some((a) => a.symbol === 'BNB')).toBe(true);
    expect(bscAssets.some((a) => a.symbol === 'USDT')).toBe(true);
  });

  it('all assets have required fields', () => {
    for (const a of getAllAssets()) {
      expect(a.id).toBeTruthy();
      expect(a.symbol).toBeTruthy();
      expect(a.network).toBeTruthy();
      expect(a.decimals).toBeGreaterThan(0);
      expect(a.standard).toBeTruthy();
    }
  });
});
