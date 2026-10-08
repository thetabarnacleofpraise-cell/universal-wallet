import { describe, it, expect, vi } from 'vitest';
import { cexController, type ExchangeId } from '@/cex/cexController';

describe('cexController', () => {
  it('lists all six supported exchanges', () => {
    const exchanges = cexController.getSupportedExchanges();
    expect(exchanges).toHaveLength(6);
    expect(exchanges).toContain('binance');
    expect(exchanges).toContain('bybit');
    expect(exchanges).toContain('okx');
    expect(exchanges).toContain('kucoin');
    expect(exchanges).toContain('coinbase');
    expect(exchanges).toContain('kraken');
  });

  it('getConnection returns null for unconnected exchange', () => {
    expect(cexController.getConnection('binance')).toBeNull();
  });

  it('getConnectedExchanges is empty initially', () => {
    expect(cexController.getConnectedExchanges()).toEqual([]);
  });

  it('getClaimableBalances filters to six-asset scope', () => {
    const balances = [
      { asset: 'ETH', free: '1.0', locked: '0', total: '1.0', usdValue: null },
      { asset: 'DOGE', free: '100', locked: '0', total: '100', usdValue: null },
      { asset: 'USDT', free: '50', locked: '0', total: '50', usdValue: null },
      { asset: 'TRX', free: '500', locked: '0', total: '500', usdValue: null },
      { asset: 'BTC', free: '0.5', locked: '0', total: '0.5', usdValue: null },
    ];
    const claimable = cexController.getClaimableBalances(balances);
    expect(claimable).toHaveLength(3);
    expect(claimable.map((b) => b.asset).sort()).toEqual(['BTC', 'ETH', 'USDT']);
  });

  it('connect throws on invalid credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: -2015, msg: 'Invalid API-key, IP, or permissions for action.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    await expect(
      cexController.connect('binance', 'badkey', 'badsecret')
    ).rejects.toThrow('Authentication failed for binance');

    vi.unstubAllGlobals();
  });
});
