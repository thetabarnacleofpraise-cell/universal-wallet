import type { CexCapabilities, CexBalance, CexWithdrawalNetwork, CexDepositAddress } from '../adapters/types';
import { BaseCexAdapter } from './baseCexAdapter';
import { hmacSha256Hex } from './cryptoUtils';

export class BybitAdapter extends BaseCexAdapter {
  readonly exchangeId = 'bybit';
  readonly exchangeName = 'Bybit';
  private baseUrl = 'https://api.bybit.com';

  private async sign(timestamp: number, recvWindow: number, params: string): Promise<string> {
    const payload = `${timestamp}${this.apiKey}${recvWindow}${params}`;
    return hmacSha256Hex(this.apiSecret!, payload);
  }

  protected async validateCredentials(): Promise<boolean> {
    const timestamp = Date.now();
    const recvWindow = '5000';
    const params = '';
    const signature = await this.sign(timestamp, parseInt(recvWindow), params);
    const res = await fetch(`${this.baseUrl}/v5/account/wallet-balance?accountType=UNIFIED`, {
      headers: { 'X-BAPI-API-KEY': this.apiKey!, 'X-BAPI-SIGN': signature, 'X-BAPI-TIMESTAMP': String(timestamp), 'X-BAPI-RECV-WINDOW': recvWindow },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.retCode === 0;
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
    const timestamp = Date.now();
    const recvWindow = '5000';
    const params = 'accountType=UNIFIED';
    const signature = await this.sign(timestamp, parseInt(recvWindow), params);
    const res = await fetch(`${this.baseUrl}/v5/account/wallet-balance?${params}`, {
      headers: { 'X-BAPI-API-KEY': this.apiKey!, 'X-BAPI-SIGN': signature, 'X-BAPI-TIMESTAMP': String(timestamp), 'X-BAPI-RECV-WINDOW': recvWindow },
    });
    if (!res.ok) throw new Error(`Bybit balances failed: ${res.status}`);
    const data = await res.json();
    const accounts = data?.result?.list ?? [];
    const balances: CexBalance[] = [];
    for (const acct of accounts) {
      const coins = acct?.coin ?? [];
      for (const c of coins) {
        if (parseFloat(c.walletBalance) > 0) {
          balances.push({ asset: c.coin, free: c.availableToWithdraw, locked: c.locked ?? '0', total: c.walletBalance, usdValue: null });
        }
      }
    }
    return balances;
  }

  async getDepositAddress(asset: string, network: string): Promise<CexDepositAddress> {
    this.requireAuth();
    const timestamp = Date.now();
    const recvWindow = '5000';
    const params = `coin=${asset}&chainType=${network}`;
    const signature = await this.sign(timestamp, parseInt(recvWindow), params);
    const res = await fetch(`${this.baseUrl}/v5/asset/deposit/create-address?${params}`, {
      method: 'POST',
      headers: { 'X-BAPI-API-KEY': this.apiKey!, 'X-BAPI-SIGN': signature, 'X-BAPI-TIMESTAMP': String(timestamp), 'X-BAPI-RECV-WINDOW': recvWindow, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Bybit deposit address failed: ${res.status}`);
    const data = await res.json();
    return { asset, network, address: data?.result?.chainAddress ?? '', tag: data?.result?.tag ?? null };
  }

  async getWithdrawalNetworks(asset: string): Promise<CexWithdrawalNetwork[]> {
    this.requireAuth();
    const timestamp = Date.now();
    const recvWindow = '5000';
    const params = `coin=${asset}`;
    const signature = await this.sign(timestamp, parseInt(recvWindow), params);
    const res = await fetch(`${this.baseUrl}/v5/asset/coin/info?${params}`, {
      headers: { 'X-BAPI-API-KEY': this.apiKey!, 'X-BAPI-SIGN': signature, 'X-BAPI-TIMESTAMP': String(timestamp), 'X-BAPI-RECV-WINDOW': recvWindow },
    });
    if (!res.ok) throw new Error(`Bybit withdrawal networks failed: ${res.status}`);
    const data = await res.json();
    const coins = data?.result?.rows ?? [];
    const coin = coins.find((c: any) => c.coin === asset);
    if (!coin?.chains) return [];
    return coin.chains.map((ch: any) => ({
      network: ch.chain, chainId: ch.chainId ?? null, withdrawalFee: ch.withdrawFee, minWithdrawal: ch.withdrawMin, enabled: ch.withdrawStatus === 'on',
    }));
  }

  async withdraw(asset: string, network: string, address: string, amount: string): Promise<string> {
    this.requireAuth();
    const timestamp = Date.now();
    const recvWindow = '5000';
    const body = { coin: asset, chain: network, address, amount };
    const params = JSON.stringify(body);
    const signature = await this.sign(timestamp, parseInt(recvWindow), params);
    const res = await fetch(`${this.baseUrl}/v5/asset/withdraw/create`, {
      method: 'POST',
      headers: { 'X-BAPI-API-KEY': this.apiKey!, 'X-BAPI-SIGN': signature, 'X-BAPI-TIMESTAMP': String(timestamp), 'X-BAPI-RECV-WINDOW': recvWindow, 'Content-Type': 'application/json' },
      body: params,
    });
    if (!res.ok) throw new Error(`Bybit withdraw failed: ${res.status}`);
    const data = await res.json();
    return data?.result?.id ?? '';
  }
}
