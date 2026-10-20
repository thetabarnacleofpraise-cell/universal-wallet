import type { CexCapabilities, CexBalance, CexWithdrawalNetwork, CexDepositAddress } from '../adapters/types';
import { BaseCexAdapter } from './baseCexAdapter';
import { hmacSha512Base64 } from './cryptoUtils';

export class KrakenAdapter extends BaseCexAdapter {
  readonly exchangeId = 'kraken';
  readonly exchangeName = 'Kraken';
  private baseUrl = 'https://api.kraken.com';

  private async sign(path: string, nonce: string, body: string): Promise<string> {
    const message = path + nonce + body;
    return hmacSha512Base64(this.apiSecret!, message);
  }

  protected async validateCredentials(): Promise<boolean> {
    const path = '/0/private/Balance';
    const nonce = Date.now().toString();
    const body = `nonce=${nonce}`;
    const signature = await this.sign(path, nonce, body);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'API-Key': this.apiKey!, 'API-Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.error === undefined || data?.error?.length === 0;
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
    const path = '/0/private/Balance';
    const nonce = Date.now().toString();
    const body = `nonce=${nonce}`;
    const signature = await this.sign(path, nonce, body);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'API-Key': this.apiKey!, 'API-Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`Kraken balances failed: ${res.status}`);
    const data = await res.json();
    const balances = data?.result ?? {};
    return Object.entries(balances)
      .filter(([, v]) => parseFloat(v as string) > 0)
      .map(([asset, v]) => ({ asset, free: String(v), locked: '0', total: String(v), usdValue: null }));
  }

  async getDepositAddress(asset: string, network: string): Promise<CexDepositAddress> {
    this.requireAuth();
    const path = '/0/private/DepositAddresses';
    const nonce = Date.now().toString();
    const body = `nonce=${nonce}&asset=${asset}&method=${network}`;
    const signature = await this.sign(path, nonce, body);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'API-Key': this.apiKey!, 'API-Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`Kraken deposit address failed: ${res.status}`);
    const data = await res.json();
    const addr = data?.result?.[0];
    return { asset, network, address: addr?.address ?? '', tag: addr?.tag ?? null };
  }

  async getWithdrawalNetworks(asset: string): Promise<CexWithdrawalNetwork[]> {
    this.requireAuth();
    const path = '/0/private/WithdrawMethods';
    const nonce = Date.now().toString();
    const body = `nonce=${nonce}&asset=${asset}`;
    const signature = await this.sign(path, nonce, body);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'API-Key': this.apiKey!, 'API-Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const methods = data?.result ?? [];
    return methods.map((m: any) => ({
      network: m.method ?? asset, chainId: null, withdrawalFee: m.fee ?? '0', minWithdrawal: m.limit ?? '0', enabled: m.status !== 'disabled',
    }));
  }

  async withdraw(asset: string, network: string, address: string, amount: string): Promise<string> {
    this.requireAuth();
    const path = '/0/private/Withdraw';
    const nonce = Date.now().toString();
    const body = `nonce=${nonce}&asset=${asset}&address=${encodeURIComponent(address)}&amount=${amount}&maxfee=0`;
    const signature = await this.sign(path, nonce, body);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'API-Key': this.apiKey!, 'API-Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`Kraken withdraw failed: ${res.status}`);
    const data = await res.json();
    return data?.result?.refid ?? '';
  }
}
