import type { WalletAdapter, WalletCapabilities, ChainSupport, SigningCapability, TransactionCapability } from './types';

interface SolanaProvider {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  signTransaction: (tx: unknown) => Promise<unknown>;
  signAndSendTransaction: (tx: unknown) => Promise<{ signature: string }>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  isPhantom?: boolean;
  isSolflare?: boolean;
}

declare global {
  interface Window {
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
    backpack?: { solana?: SolanaProvider };
  }
}

function detectSolanaProvider(): SolanaProvider | null {
  if (typeof window === 'undefined') return null;

  if (window.phantom?.solana?.isPhantom) {
    return window.phantom.solana;
  }
  if (window.solflare?.isSolflare) {
    return window.solflare;
  }
  if (window.backpack?.solana) {
    return window.backpack.solana;
  }

  if (window.phantom?.solana) {
    return window.phantom.solana;
  }
  if (window.solflare) {
    return window.solflare;
  }

  return null;
}

function detectWalletName(provider: SolanaProvider): string {
  if (provider.isPhantom) return 'Phantom';
  if (provider.isSolflare) return 'Solflare';
  return 'Unknown Solana Wallet';
}

function detectWalletId(provider: SolanaProvider): string {
  if (provider.isPhantom) return 'phantom-solana';
  if (provider.isSolflare) return 'solflare';
  return 'unknown-solana';
}

export class SolanaWalletAdapter implements WalletAdapter {
  readonly walletId: string;
  readonly walletName: string;
  readonly walletType = 'solana' as const;

  private provider: SolanaProvider | null = null;
  private capabilities: WalletCapabilities | null = null;

  constructor(provider?: SolanaProvider) {
    if (provider) {
      this.provider = provider;
      this.walletId = detectWalletId(provider);
      this.walletName = detectWalletName(provider);
    } else {
      const detected = detectSolanaProvider();
      if (detected) {
        this.provider = detected;
        this.walletId = detectWalletId(detected);
        this.walletName = detectWalletName(detected);
      } else {
        this.walletId = 'none';
        this.walletName = 'No Solana Wallet';
      }
    }
  }

  isAvailable(): boolean {
    return this.provider !== null;
  }

  async connect(): Promise<WalletCapabilities> {
    if (!this.provider) throw new Error('No Solana provider available');

    const resp = await this.provider.connect();
    const address = resp.publicKey.toString();

    const supportedChains: ChainSupport[] = [
      { networkId: 'solana', chainId: null, engine: 'SOLANA', switchable: false },
    ];

    const signingCapabilities: SigningCapability[] = [
      { type: 'solana_sign', available: true },
    ];

    const transactionCapabilities: TransactionCapability[] = [
      { type: 'solana_send', available: typeof this.provider.signAndSendTransaction === 'function' },
    ];

    this.capabilities = {
      walletType: 'solana',
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
    const encoded = new TextEncoder().encode(message);
    const result = await this.provider.signMessage(encoded);
    return Array.from(result.signature).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async sendTransaction(txParams: unknown): Promise<string> {
    if (!this.provider || !this.capabilities) throw new Error('Wallet not connected');
    if (typeof this.provider.signAndSendTransaction !== 'function') {
      throw new Error('Wallet does not support signAndSendTransaction');
    }
    const result = await this.provider.signAndSendTransaction(txParams);
    return result.signature;
  }
}

export function detectAvailableSolanaWallets(): { id: string; name: string; available: boolean }[] {
  const detected: { id: string; name: string; available: boolean }[] = [];
  if (typeof window === 'undefined') return detected;

  if (window.phantom?.solana?.isPhantom) {
    detected.push({ id: 'phantom-solana', name: 'Phantom', available: true });
  }
  if (window.solflare?.isSolflare) {
    detected.push({ id: 'solflare', name: 'Solflare', available: true });
  }
  if (window.backpack?.solana) {
    detected.push({ id: 'backpack-solana', name: 'Backpack', available: true });
  }

  return detected;
}

export function getSolanaAdapter(): SolanaWalletAdapter | null {
  const adapter = new SolanaWalletAdapter();
  return adapter.isAvailable() ? adapter : null;
}
