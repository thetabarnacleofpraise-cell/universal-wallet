import type { CexCapabilities, CexBalance, CexWithdrawalNetwork, CexDepositAddress } from '../adapters/types';
import { BaseCexAdapter } from './baseCexAdapter';
import { hmacSha256Base64 } from './cryptoUtils';

export class OkxAdapter extends BaseCexAdapter {
  readonly exchangeId = 'okx';
  readonly exchangeName = 'OKX';
  private baseUrl = 'https://www.okx.com';

  private async sign(timestamp: string, method: string, path: string, body: string = ''): Promise<string> {
    const prehash = `${timestamp}${method.toUpperCase()}${path}${body}`;
    return hmacSha256Base64(this.apiSecret!, prehash);
  }

  private getHeaders(method: string, path: string, body: string = ''): Promise<Record<string, string>> {
    const timestamp = new Date().toISOString();
    return this.sign(timestamp, method, path, body).then((sig) => ({
      'OK-ACCESS-KEY': this.apiKey!,
      'OK-ACCESS-SIGN': sig,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase ?? '',
      'Content-Type': 'application/json',
    }));
  }

  protected async validateCredentials(): Promise<boolean> {
    const headers = await this.getHeaders('GET', '/api/v5/account/balance');
    const res = await fetch(`${this.baseUrl}/api/v5/account/balance`, { headers });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.code === '0';
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
    const path = '/api/v5/account/balance';
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`OKX balances failed: ${res.status}`);
    const data = await res.json();
    const balances: CexBalance[] = [];
    for (const acct of data?.data ?? []) {
      for (const detail of acct?.details ?? []) {
        if (parseFloat(detail.availBal) > 0 || parseFloat(detail.frozenBal) > 0) {
          balances.push({ asset: detail.ccy, free: detail.availBal, locked: detail.frozenBal, total: detail.eq, usdValue: null });
        }
      }
    }
    return balances;
  }

  async getDepositAddress(asset: string, network: string): Promise<CexDepositAddress> {
    this.requireAuth();
    const path = `/api/v5/asset/deposit-address?ccy=${asset}`;
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`OKX deposit address failed: ${res.status}`);
    const data = await res.json();
    const addr = data?.data?.[0];
    return { asset, network, address: addr?.addr ?? '', tag: addr?.tag ?? null };
  }

  async getWithdrawalNetworks(asset: string): Promise<CexWithdrawalNetwork[]> {
    this.requireAuth();
    const path = `/api/v5/asset/currencies?ccy=${asset}`;
    const headers = await this.getHeaders('GET', path);
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`OKX withdrawal networks failed: ${res.status}`);
    const data = await res.json();
    return (data?.data ?? []).map((c: any) => ({
      network: c.chain, chainId: c.chainId ?? null, withdrawalFee: c.minFee, minWithdrawal: c.minWd, enabled: c.canWd,
    }));
  }

  async withdraw(asset: string, network: string, address: string, amount: string): Promise<string> {
    this.requireAuth();
    const path = '/api/v5/asset/withdrawal';
    const body = JSON.stringify({ ccy: asset, chain: network, dest: '4', toAddr: address, amt: amount });
    const headers = await this.getHeaders('POST', path, body);
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`OKX withdraw failed: ${res.status}`);
    const data = await res.json();
    return data?.data?.[0]?.wdId ?? '';
  }
}
