import type { CexCapabilities, CexBalance, CexWithdrawalNetwork, CexDepositAddress } from '../adapters/types';
import { BaseCexAdapter } from './baseCexAdapter';
import { hmacSha256Hex } from './cryptoUtils';

export class KucoinAdapter extends BaseCexAdapter {
  readonly exchangeId = 'kucoin';
  readonly exchangeName = 'KuCoin';
  private baseUrl = 'https://api.kucoin.com';

  private async sign(timestamp: number, method: string, path: string, body: string = ''): Promise<string> {
    const prehash = `${timestamp}${method.toUpperCase()}${path}${body}`;
    return hmacSha256Hex(this.apiSecret!, prehash);
  }

  private async getHeaders(method: string, path: string, body: string = ''): Promise<Record<string, string>> {
    const timestamp = Date.now();
    const signature = await this.sign(timestamp, method, path, body);
    return {
      'KC-API-KEY': this.apiKey!,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': String(timestamp),
      'KC-API-PASSPHRASE': this.passphrase ?? '',
      'KC-API-KEY-VERSION': '2',
      'Content-Type': 'application/json',
    };
  }

  protected async validateCredentials(): Promise<boolean> {
    const path = '/api/v1/accounts';
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.code === '200000';
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
    const path = '/api/v1/accounts';
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`KuCoin balances failed: ${res.status}`);
    const data = await res.json();
    const accounts = data?.data ?? [];
    const merged: Record<string, { free: number; locked: number }> = {};
    for (const a of accounts) {
      if (!merged[a.currency]) merged[a.currency] = { free: 0, locked: 0 };
      if (a.type === 'trade') merged[a.currency].free += parseFloat(a.balance);
      if (a.type === 'main') merged[a.currency].locked += parseFloat(a.balance);
    }
    return Object.entries(merged)
      .filter(([, v]) => v.free > 0 || v.locked > 0)
      .map(([asset, v]) => ({ asset, free: String(v.free), locked: String(v.locked), total: String(v.free + v.locked), usdValue: null }));
  }

  async getDepositAddress(asset: string, network: string): Promise<CexDepositAddress> {
    this.requireAuth();
    const path = `/api/v1/deposit-addresses?currency=${asset}&chain=${network}`;
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`KuCoin deposit address failed: ${res.status}`);
    const data = await res.json();
    const addr = data?.data?.[0];
    return { asset, network, address: addr?.address ?? '', tag: addr?.memo ?? null };
  }

  async getWithdrawalNetworks(asset: string): Promise<CexWithdrawalNetwork[]> {
    this.requireAuth();
    const path = `/api/v1/currencies/${asset}`;
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`KuCoin withdrawal networks failed: ${res.status}`);
    const data = await res.json();
    const chains = data?.data?.chains ?? [];
    return chains.map((ch: any) => ({
      network: ch.chainName, chainId: null, withdrawalFee: ch.withdrawalMinFee, minWithdrawal: ch.withdrawalMinSize, enabled: ch.isWithdrawEnabled,
    }));
  }

  async withdraw(asset: string, network: string, address: string, amount: string): Promise<string> {
    this.requireAuth();
    const path = '/api/v1/withdrawals';
    const body = JSON.stringify({ currency: asset, chain: network, address, amount });
    const headers = await this.getHeaders('POST', path, body);
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`KuCoin withdraw failed: ${res.status}`);
    const data = await res.json();
    return data?.data?.withdrawalId ?? '';
  }
}
