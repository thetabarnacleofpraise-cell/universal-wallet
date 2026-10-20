import type { CexCapabilities, CexBalance, CexWithdrawalNetwork, CexDepositAddress } from '../adapters/types';
import { BaseCexAdapter } from './baseCexAdapter';
import { hmacSha256Hex } from './cryptoUtils';

export class BinanceAdapter extends BaseCexAdapter {
  readonly exchangeId = 'binance';
  readonly exchangeName = 'Binance';
  private baseUrl = 'https://api.binance.com';

  private async sign(queryString: string): Promise<string> {
    return hmacSha256Hex(this.apiSecret!, queryString);
  }

  protected async validateCredentials(): Promise<boolean> {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&recvWindow=5000`;
    const signature = await this.sign(queryString);

    const res = await fetch(`${this.baseUrl}/sapi/v1/account?${queryString}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': this.apiKey! },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.accountType !== undefined;
  }

  async getCapabilities(): Promise<CexCapabilities> {
    this.requireAuth();
    return {
      exchangeId: this.exchangeId,
      exchangeName: this.exchangeName,
      authenticated: this.authenticated,
      supportsBalances: true,
      supportsDepositAddresses: true,
      supportsWithdrawals: true,
      supportedAssets: [],
      supportedWithdrawalNetworks: [],
      rateLimitRemaining: null,
    };
  }

  async getBalances(): Promise<CexBalance[]> {
    this.requireAuth();
    const timestamp = Date.now();
    const qs = `timestamp=${timestamp}&recvWindow=5000`;
    const signature = await this.sign(qs);
    const res = await fetch(`${this.baseUrl}/sapi/v1/capital/config/getall?${qs}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': this.apiKey! },
    });
    if (!res.ok) throw new Error(`Binance balances failed: ${res.status}`);
    const data = await res.json() as Array<{ coin: string; free: string; locked: string; freezing: string; balance: string }>;
    return data
      .filter((c) => parseFloat(c.free) > 0 || parseFloat(c.locked) > 0)
      .map((c) => ({ asset: c.coin, free: c.free, locked: c.locked, total: c.balance, usdValue: null }));
  }

  async getDepositAddress(asset: string, network: string): Promise<CexDepositAddress> {
    this.requireAuth();
    const timestamp = Date.now();
    const qs = `coin=${asset}&network=${network}&timestamp=${timestamp}`;
    const signature = await this.sign(qs);
    const res = await fetch(`${this.baseUrl}/sapi/v1/capital/deposit/address?${qs}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': this.apiKey! },
    });
    if (!res.ok) throw new Error(`Binance deposit address failed: ${res.status}`);
    const data = await res.json();
    return { asset, network, address: data?.address ?? '', tag: data?.tag ?? null };
  }

  async getWithdrawalNetworks(asset: string): Promise<CexWithdrawalNetwork[]> {
    this.requireAuth();
    const timestamp = Date.now();
    const qs = `timestamp=${timestamp}`;
    const signature = await this.sign(qs);
    const res = await fetch(`${this.baseUrl}/sapi/v1/capital/config/getall?${qs}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': this.apiKey! },
    });
    if (!res.ok) throw new Error(`Binance withdrawal networks failed: ${res.status}`);
    const data = await res.json() as Array<{ coin: string; networkList: Array<{ network: string; withdrawFee: string; withdrawMin: string; withdrawEnabled: boolean; chainId?: string }> }>;
    const coinInfo = data.find((c) => c.coin === asset);
    if (!coinInfo) return [];
    return coinInfo.networkList.map((n) => ({
      network: n.network, chainId: n.chainId ?? null, withdrawalFee: n.withdrawFee, minWithdrawal: n.withdrawMin, enabled: n.withdrawEnabled,
    }));
  }

  async withdraw(asset: string, network: string, address: string, amount: string): Promise<string> {
    this.requireAuth();
    const timestamp = Date.now();
    const qs = `coin=${asset}&network=${network}&address=${address}&amount=${amount}&timestamp=${timestamp}`;
    const signature = await this.sign(qs);
    const res = await fetch(`${this.baseUrl}/sapi/v1/capital/withdraw/apply?${qs}&signature=${signature}`, {
      method: 'POST', headers: { 'X-MBX-APIKEY': this.apiKey! },
    });
    if (!res.ok) throw new Error(`Binance withdraw failed: ${res.status}`);
    const data = await res.json();
    return data?.id ?? '';
  }
}
