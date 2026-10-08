import { describe, it, expect } from 'vitest';
import { universalRouter } from '@/routing/universalRouter';
import { getNetwork, getNetworkByChainId, getAllNetworks, getEvmNetworks, getNetworksByEngine, getNetworkIds } from '@/registry/networkRegistry';

describe('networkRegistry', () => {
  it('has all required networks', () => {
    const ids = getNetworkIds();
    expect(ids).toContain('ethereum');
    expect(ids).toContain('base');
    expect(ids).toContain('bsc');
    expect(ids).toContain('arbitrum');
    expect(ids).toContain('optimism');
    expect(ids).toContain('polygon');
    expect(ids).toContain('tron');
    expect(ids).toContain('bitcoin');
    expect(ids).toContain('solana');
    expect(ids).toContain('ton');
  });

  it('BSC has chainId 56', () => {
    const bsc = getNetwork('bsc');
    expect(bsc?.chainId).toBe(56);
    expect(bsc?.engine).toBe('EVM');
    expect(bsc?.nativeAsset).toBe('BNB');
  });

  it('Ethereum has chainId 1', () => {
    const eth = getNetwork('ethereum');
    expect(eth?.chainId).toBe(1);
    expect(eth?.nativeAsset).toBe('ETH');
  });

  it('getNetworkByChainId finds BSC', () => {
    const bsc = getNetworkByChainId(56);
    expect(bsc?.id).toBe('bsc');
  });

  it('getEvmNetworks returns only EVM networks', () => {
    const evm = getEvmNetworks();
    for (const n of evm) {
      expect(n.engine).toBe('EVM');
    }
    expect(evm.length).toBeGreaterThanOrEqual(6);
  });

  it('getNetworksByEngine returns correct engine networks', () => {
    const solana = getNetworksByEngine('SOLANA');
    expect(solana.length).toBe(1);
    expect(solana[0].id).toBe('solana');
  });

  it('TON is present as capability network', () => {
    const ton = getNetwork('ton');
    expect(ton?.engine).toBe('TON');
    expect(ton?.nativeAsset).toBe('TON');
  });
});

describe('universalRouter', () => {
  it('routes wallet source to correct engine', () => {
    const result = universalRouter.routeOperation({
      source: '0xabc',
      sourceType: 'wallet',
      network: 'ethereum',
      asset: 'ETH',
      operation: 'discover',
    });
    expect(result.adapterType).toBe('wallet');
    expect(result.engine).toBe('EVM');
    expect(result.handled).toBe(true);
  });

  it('routes CEX source to cex type', () => {
    const result = universalRouter.routeOperation({
      source: 'binance',
      sourceType: 'cex',
      network: 'ethereum',
      asset: 'ETH',
      operation: 'discover',
    });
    expect(result.adapterType).toBe('cex');
    expect(result.adapterId).toBe('cex:binance');
  });

  it('getEngineForNetwork throws for unknown network', () => {
    expect(() => universalRouter.getEngineForNetwork('nonexistent')).toThrow();
  });

  it('getEngineForNetwork returns correct engine', () => {
    expect(universalRouter.getEngineForNetwork('ethereum')).toBe('EVM');
    expect(universalRouter.getEngineForNetwork('bsc')).toBe('EVM');
    expect(universalRouter.getEngineForNetwork('solana')).toBe('SOLANA');
    expect(universalRouter.getEngineForNetwork('bitcoin')).toBe('BTC');
    expect(universalRouter.getEngineForNetwork('tron')).toBe('TRON');
    expect(universalRouter.getEngineForNetwork('ton')).toBe('TON');
  });

  it('getChainAdapter returns null for unknown network', () => {
    expect(universalRouter.getChainAdapter('nonexistent')).toBeNull();
  });

  it('getChainAdapter returns adapter for each known network', () => {
    expect(universalRouter.getChainAdapter('ethereum')).not.toBeNull();
    expect(universalRouter.getChainAdapter('bsc')).not.toBeNull();
    expect(universalRouter.getChainAdapter('solana')).not.toBeNull();
    expect(universalRouter.getChainAdapter('bitcoin')).not.toBeNull();
    expect(universalRouter.getChainAdapter('tron')).not.toBeNull();
    expect(universalRouter.getChainAdapter('ton')).not.toBeNull();
  });

  it('getWalletTypeForNetwork maps engines to wallet types', () => {
    expect(universalRouter.getWalletTypeForNetwork('ethereum')).toBe('evm');
    expect(universalRouter.getWalletTypeForNetwork('solana')).toBe('solana');
    expect(universalRouter.getWalletTypeForNetwork('bitcoin')).toBe('bitcoin');
    expect(universalRouter.getWalletTypeForNetwork('tron')).toBe('tron');
    expect(universalRouter.getWalletTypeForNetwork('ton')).toBe('ton');
  });
});
