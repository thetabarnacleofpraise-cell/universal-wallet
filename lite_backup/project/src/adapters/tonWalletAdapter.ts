import type { WalletAdapter, WalletCapabilities, ChainSupport, SigningCapability, TransactionCapability } from './types';

interface TonProvider {
  connect: () => Promise<{ address: string; publicKey: string }>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  sendTransaction?: (tx: unknown) => Promise<{ hash: string }>;
  tonConnectUi?: unknown;
}

declare global {
  interface Window {
    tonkeeper?: TonProvider;
    tonconnect?: TonProvider;
  }
}

function detectTonProvider(): { provider: TonProvider; name: string; id: string } | null {
  if (typeof window === 'undefined') return null;

  if (window.tonkeeper) {
    return { provider: window.tonkeeper, name: 'Tonkeeper', id: 'tonkeeper' };
  }
  if (window.tonconnect) {
    return { provider: window.tonconnect, name: 'TON Connect', id: 'ton-connect' };
  }

  return null;
}

export class TonWalletAdapter implements WalletAdapter {
  readonly walletId: string;
  readonly walletName: string;
  readonly walletType = 'ton' as const;

  private provider: TonProvider | null = null;
  private capabilities: WalletCapabilities | null = null;

  constructor(provider?: TonProvider, id?: string, name?: string) {
    if (provider) {
      this.provider = provider;
      this.walletId = id ?? 'tonkeeper';
      this.walletName = name ?? 'Tonkeeper';
    } else {
      const detected = detectTonProvider();
      if (detected) {
        this.provider = detected.provider;
        this.walletId = detected.id;
        this.walletName = detected.name;
      } else {
        this.walletId = 'none';
        this.walletName = 'No TON Wallet';
      }
    }
  }

  isAvailable(): boolean {
    return this.provider !== null;
  }

  async connect(): Promise<WalletCapabilities> {
    if (!this.provider) throw new Error('No TON provider available');

    const result = await this.provider.connect();
    const address = result.address;

    if (!address) throw new Error('No TON address returned');

    const supportedChains: ChainSupport[] = [
      { networkId: 'ton', chainId: null, engine: 'TON', switchable: false },
    ];

    const signingCapabilities: SigningCapability[] = [
      { type: 'ton_sign', available: typeof this.provider.signMessage === 'function' },
    ];

    const transactionCapabilities: TransactionCapability[] = [
      { type: 'ton_send', available: typeof this.provider.sendTransaction === 'function' },
    ];

    this.capabilities = {
      walletType: 'ton',
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
    if (this.provider) {
      try { await this.provider.disconnect(); } catch {}
    }
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
    return await this.provider.signMessage(message);
  }

  async sendTransaction(txParams: unknown): Promise<string> {
    if (!this.provider || !this.capabilities) throw new Error('Wallet not connected');
    if (typeof this.provider.sendTransaction !== 'function') {
      throw new Error('Wallet does not support sendTransaction');
    }
    const result = await this.provider.sendTransaction(txParams);
    return result.hash;
  }
}

export function detectAvailableTonWallets(): { id: string; name: string; available: boolean }[] {
  if (typeof window === 'undefined') return [];
  const detected = detectTonProvider();
  if (detected) {
    return [{ id: detected.id, name: detected.name, available: true }];
  }
  return [];
}

export function getTonAdapter(): TonWalletAdapter | null {
  const adapter = new TonWalletAdapter();
  return adapter.isAvailable() ? adapter : null;
}
