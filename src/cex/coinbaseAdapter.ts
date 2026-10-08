import type { CexCapabilities, CexBalance, CexWithdrawalNetwork, CexDepositAddress } from '../adapters/types';
import { BaseCexAdapter } from './baseCexAdapter';
import { hmacSha256Base64 } from './cryptoUtils';

export class CoinbaseAdapter extends BaseCexAdapter {
  readonly exchangeId = 'coinbase';
  readonly exchangeName = 'Coinbase';
  private baseUrl = 'https://api.exchange.coinbase.com';

  private async sign(timestamp: string, method: string, path: string, body: string = ''): Promise<string> {
    const prehash = `${timestamp}${method.toUpperCase()}${path}${body}`;
    return hmacSha256Base64(this.apiSecret!, prehash);
  }

  private async getHeaders(method: string, path: string, body: string = ''): Promise<Record<string, string>> {
    const timestamp = Date.now().toString();
    const signature = await this.sign(timestamp, method, path, body);
    return {
      'CB-ACCESS-KEY': this.apiKey!,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-PASSPHRASE': this.passphrase ?? '',
      'Content-Type': 'application/json',
    };
  }

  protected async validateCredentials(): Promise<boolean> {
    const path = '/accounts';
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data);
  }

  async getCapabilities(): Promise<CexCapabilities> {
    this.requireAuth();
    return {
      exchangeId: this.exchangeId, exchangeName: this.exchangeName, authenticated: this.authenticated,
      supportsBalances: true, supportsDepositAddresses: true, supportsWithdrawals: true,
      supportedAssets: [], supportedWithdrawalNetworks: [], rateLimitRemaining: null,
    };
  }

  async getBalances(): Promise<CexBalance[]> {
    this.requireAuth();
    const path = '/accounts';
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`Coinbase balances failed: ${res.status}`);
    const data = await res.json() as Array<{ currency: string; balance: string; available: string; hold: string }>;
    return data
      .filter((a) => parseFloat(a.balance) > 0)
      .map((a) => ({ asset: a.currency, free: a.available, locked: a.hold, total: a.balance, usdValue: null }));
  }

  async getDepositAddress(asset: string, network: string): Promise<CexDepositAddress> {
    this.requireAuth();
    const path = `/coinbase-accounts`;
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`Coinbase deposit address failed: ${res.status}`);
    const data = await res.json() as Array<{ currency: string; active: boolean; deposit_address: string }>;
    const acct = data.find((a) => a.currency === asset);
    return { asset, network, address: acct?.deposit_address ?? '', tag: null };
  }

  async getWithdrawalNetworks(asset: string): Promise<CexWithdrawalNetwork[]> {
    this.requireAuth();
    const path = `/currencies/${asset}`;
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.details) return [];
    return [{
      network: data.details.network ?? data.id, chainId: null,
      withdrawalFee: data.details?.withdrawal_fee ?? '0', minWithdrawal: data.min_size ?? '0', enabled: data.status === 'online',
    }];
  }

  async withdraw(asset: string, network: string, address: string, amount: string): Promise<string> {
    this.requireAuth();
    const path = '/withdrawals/crypto';
    const body = JSON.stringify({ currency: asset, crypto_address: address, amount, crypto_network: network });
    const headers = await this.getHeaders('POST', path, body);
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`Coinbase withdraw failed: ${res.status}`);
    const data = await res.json();
    return data?.id ?? '';
  }
}
