import type { CexAdapter, CexCapabilities, CexBalance, CexWithdrawalNetwork, CexDepositAddress } from '../adapters/types';

export abstract class BaseCexAdapter implements CexAdapter {
  abstract readonly exchangeId: string;
  abstract readonly exchangeName: string;

  protected apiKey: string | null = null;
  protected apiSecret: string | null = null;
  protected passphrase: string | null = null;
  protected authenticated = false;

  isConfigured(): boolean {
    return this.apiKey !== null && this.apiSecret !== null;
  }

  async authenticate(apiKey: string, apiSecret: string, passphrase?: string): Promise<boolean> {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    if (passphrase) this.passphrase = passphrase;

    try {
      const valid = await this.validateCredentials();
      this.authenticated = valid;
      return valid;
    } catch {
      this.authenticated = false;
      return false;
    }
  }

  protected abstract validateCredentials(): Promise<boolean>;
  abstract getCapabilities(): Promise<CexCapabilities>;
  abstract getBalances(): Promise<CexBalance[]>;
  abstract getDepositAddress(asset: string, network: string): Promise<CexDepositAddress>;
  abstract getWithdrawalNetworks(asset: string): Promise<CexWithdrawalNetwork[]>;
  abstract withdraw(asset: string, network: string, address: string, amount: string): Promise<string>;

  protected requireAuth(): void {
    if (!this.authenticated) {
      throw new Error(`${this.exchangeName}: Not authenticated. Call authenticate() first.`);
    }
  }
}
