import type { CexAdapter, CexCapabilities, CexBalance } from '../adapters/types';
import { BinanceAdapter } from './binanceAdapter';
import { BybitAdapter } from './bybitAdapter';
import { OkxAdapter } from './okxAdapter';
import { KucoinAdapter } from './kucoinAdapter';
import { CoinbaseAdapter } from './coinbaseAdapter';
import { KrakenAdapter } from './krakenAdapter';
import { isClaimAsset } from '@/claim/fiveAssetScope';

export type ExchangeId = 'binance' | 'bybit' | 'okx' | 'kucoin' | 'coinbase' | 'kraken';

const ADAPTERS: Record<ExchangeId, () => CexAdapter> = {
  binance: () => new BinanceAdapter(),
  bybit: () => new BybitAdapter(),
  okx: () => new OkxAdapter(),
  kucoin: () => new KucoinAdapter(),
  coinbase: () => new CoinbaseAdapter(),
  kraken: () => new KrakenAdapter(),
};

export interface CexConnection {
  exchangeId: ExchangeId;
  adapter: CexAdapter;
  capabilities: CexCapabilities;
}

export class CexController {
  private connections: Map<ExchangeId, CexConnection> = new Map();

  getSupportedExchanges(): ExchangeId[] {
    return Object.keys(ADAPTERS) as ExchangeId[];
  }

  async connect(exchangeId: ExchangeId, apiKey: string, apiSecret: string, passphrase?: string): Promise<CexConnection> {
    const adapter = ADAPTERS[exchangeId]();
    const authed = await adapter.authenticate(apiKey, apiSecret, passphrase);
    if (!authed) throw new Error(`Authentication failed for ${exchangeId}`);
    const capabilities = await adapter.getCapabilities();
    const conn = { exchangeId, adapter, capabilities };
    this.connections.set(exchangeId, conn);
    return conn;
  }

  async disconnect(exchangeId: ExchangeId): Promise<void> {
    this.connections.delete(exchangeId);
  }

  getConnection(exchangeId: ExchangeId): CexConnection | null {
    return this.connections.get(exchangeId) ?? null;
  }

  getConnectedExchanges(): ExchangeId[] {
    return Array.from(this.connections.keys());
  }

  async getBalances(exchangeId: ExchangeId): Promise<CexBalance[]> {
    const conn = this.connections.get(exchangeId);
    if (!conn) throw new Error(`${exchangeId} not connected`);
    return await conn.adapter.getBalances();
  }

  async getAllBalances(): Promise<{ exchange: ExchangeId; balances: CexBalance[] }[]> {
    const results: { exchange: ExchangeId; balances: CexBalance[] }[] = [];
    for (const [id, conn] of this.connections) {
      try {
        const balances = await conn.adapter.getBalances();
        results.push({ exchange: id, balances });
      } catch {
        results.push({ exchange: id, balances: [] });
      }
    }
    return results;
  }

  getClaimableBalances(balances: CexBalance[]): CexBalance[] {
    return balances.filter((b) => isClaimAsset(b.asset));
  }
}

export const cexController = new CexController();
