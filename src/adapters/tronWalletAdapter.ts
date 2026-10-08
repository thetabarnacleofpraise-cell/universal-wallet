import type { WalletAdapter, WalletCapabilities, ChainSupport, SigningCapability, TransactionCapability } from './types';

interface TronProvider {
  request: (method: string, params?: unknown) => Promise<unknown>;
  sign: (message: string) => Promise<string>;
  signTransaction: (tx: unknown) => Promise<{ transaction: unknown }>;
  tronWeb?: unknown;
  ready?: boolean;
}

declare global {
  interface Window {
    tronLink?: TronProvider & { tronWeb?: unknown };
    tron?: TronProvider;
  }
}

function detectTronProvider(): TronProvider | null {
  if (typeof window === 'undefined') return null;

  if (window.tronLink?.ready) {
    return window.tronLink;
  }
  if (window.tronLink) {
    return window.tronLink;
  }
  if (window.tron) {
    return window.tron;
  }

  return null;
}

export class TronWalletAdapter implements WalletAdapter {
  readonly walletId = 'tronlink';
  readonly walletName = 'TronLink';
  readonly walletType = 'tron' as const;

  private provider: TronProvider | null = null;
  private capabilities: WalletCapabilities | null = null;

  constructor(provider?: TronProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      const detected = detectTronProvider();
      if (detected) {
        this.provider = detected;
      }
    }
  }

  isAvailable(): boolean {
    return this.provider !== null;
  }

  async connect(): Promise<WalletCapabilities> {
    if (!this.provider) throw new Error('No TRON provider available');

    let address: string | undefined;

    try {
      const result = await this.provider.request('tron_requestAccounts');
      if (result && typeof result === 'object') {
        const r = result as { address?: string; code?: number };
        if (r.code !== 200 && r.code !== 4001 && !r.address) {
          throw new Error('TronLink connection rejected');
        }
        address = r.address;
      }
    } catch {
      throw new Error('TronLink connection failed');
    }

    if (!address) {
      try {
        const accounts = await this.provider.request('getAccount') as unknown;
        if (typeof accounts === 'string') address = accounts;
      } catch {}
    }

    if (!address) {
      throw new Error('No TRON account available');
    }

    const supportedChains: ChainSupport[] = [
      { networkId: 'tron', chainId: null, engine: 'TRON', switchable: false },
    ];

    const signingCapabilities: SigningCapability[] = [
      { type: 'tron_sign', available: typeof this.provider.sign === 'function' },
    ];

    const transactionCapabilities: TransactionCapability[] = [
      { type: 'tron_send', available: typeof this.provider.signTransaction === 'function' },
    ];

    this.capabilities = {
      walletType: 'tron',
      walletId: this.walletId,
      walletName: this.walletName,
      address,
      connected: true,
      supportedChains,
      signingCapabilities,
      transactionCapabilities,
      supportsNetworkSwitching: false,
      supportsMultipleAccounts: false,
    };

    return this.capabilities;
  }

  async disconnect(): Promise<void> {
    this.capabilities = null;
  }

  getCapabilities(): WalletCapabilities | null {
    return this.capabilities;
  }

  async getAccounts(): Promise<string[]> {
    if (!this.capabilities) return [];
    return [this.capabilities.address];
  }

  async switchChain(_networkId: string): Promise<boolean> {
    return false;
  }

  async signMessage(message: string): Promise<string> {
    if (!this.provider || !this.capabilities) throw new Error('Wallet not connected');
    return await this.provider.sign(message);
  }

  async sendTransaction(txParams: unknown): Promise<string> {
    if (!this.provider || !this.capabilities) throw new Error('Wallet not connected');
    const result = await this.provider.signTransaction(txParams);
    return JSON.stringify(result.transaction);
  }
}

export function detectAvailableTronWallets(): { id: string; name: string; available: boolean }[] {
  if (typeof window === 'undefined') return [];
  const provider = detectTronProvider();
  if (provider) {
    return [{ id: 'tronlink', name: 'TronLink', available: true }];
  }
  return [];
}

export function getTronAdapter(): TronWalletAdapter | null {
  const adapter = new TronWalletAdapter();
  return adapter.isAvailable() ? adapter : null;
}
