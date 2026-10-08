import type { WalletAdapter, WalletCapabilities, ChainSupport, SigningCapability, TransactionCapability } from './types';

interface BtcProvider {
  connect: () => Promise<{ address: string; publicKey: string }>;
  signMessage: (message: string) => Promise<string>;
  signPsbt: (psbtHex: string) => Promise<string>;
  signAndBroadcast?: (psbtHex: string) => Promise<string>;
  getAccounts?: () => Promise<string[]>;
}

declare global {
  interface Window {
    unisat?: BtcProvider;
    xverse?: { getAccounts: () => Promise<string[]>; signMessage: (address: string, message: string) => Promise<string>; signPsbt: (psbtHex: string) => Promise<string> };
    leather?: { getAccounts: () => Promise<{ address: string; publicKey: string }[]>; signMessage: (address: string, message: string) => Promise<string>; signPsbt: (psbtHex: string) => Promise<string> };
    okxwallet?: { bitcoin?: BtcProvider };
  }
}

function detectBtcProvider(): { provider: BtcProvider; name: string; id: string } | null {
  if (typeof window === 'undefined') return null;

  if (window.unisat) {
    return { provider: window.unisat, name: 'UniSat', id: 'unisat' };
  }
  if (window.okxwallet?.bitcoin) {
    return { provider: window.okxwallet.bitcoin, name: 'OKX Wallet (BTC)', id: 'okx-btc' };
  }
  if (window.xverse) {
    const xverse = window.xverse;
    const adapted: BtcProvider = {
      connect: async () => {
        const accounts = await xverse.getAccounts();
        return { address: accounts[0] ?? '', publicKey: '' };
      },
      signMessage: async (message: string) => {
        const accounts = await xverse.getAccounts();
        return xverse.signMessage(accounts[0] ?? '', message);
      },
      signPsbt: async (psbtHex: string) => xverse.signPsbt(psbtHex),
    };
    return { provider: adapted, name: 'Xverse', id: 'xverse' };
  }
  if (window.leather) {
    const leather = window.leather;
    const adapted: BtcProvider = {
      connect: async () => {
        const accounts = await leather.getAccounts();
        return { address: accounts[0]?.address ?? '', publicKey: accounts[0]?.publicKey ?? '' };
      },
      signMessage: async (message: string) => {
        const accounts = await leather.getAccounts();
        return leather.signMessage(accounts[0]?.address ?? '', message);
      },
      signPsbt: async (psbtHex: string) => leather.signPsbt(psbtHex),
    };
    return { provider: adapted, name: 'Leather', id: 'leather' };
  }

  return null;
}

export class BitcoinWalletAdapter implements WalletAdapter {
  readonly walletId: string;
  readonly walletName: string;
  readonly walletType = 'bitcoin' as const;

  private provider: BtcProvider | null = null;
  private capabilities: WalletCapabilities | null = null;

  constructor(provider?: BtcProvider, id?: string, name?: string) {
    if (provider) {
      this.provider = provider;
      this.walletId = id ?? 'unknown-btc';
      this.walletName = name ?? 'Unknown BTC Wallet';
    } else {
      const detected = detectBtcProvider();
      if (detected) {
        this.provider = detected.provider;
        this.walletId = detected.id;
        this.walletName = detected.name;
      } else {
        this.walletId = 'none';
        this.walletName = 'No Bitcoin Wallet';
      }
    }
  }

  isAvailable(): boolean {
    return this.provider !== null;
  }

  async connect(): Promise<WalletCapabilities> {
    if (!this.provider) throw new Error('No Bitcoin provider available');

    const result = await this.provider.connect();
    const address = result.address;

    if (!address) throw new Error('No Bitcoin address returned');

    const supportedChains: ChainSupport[] = [
      { networkId: 'bitcoin', chainId: null, engine: 'BTC', switchable: false },
    ];

    const signingCapabilities: SigningCapability[] = [
      { type: 'btc_sign', available: typeof this.provider.signMessage === 'function' },
    ];

    const transactionCapabilities: TransactionCapability[] = [
      { type: 'btc_send', available: typeof this.provider.signAndBroadcast === 'function' },
    ];

    this.capabilities = {
      walletType: 'bitcoin',
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
    return await this.provider.signMessage(message);
  }

  async sendTransaction(txParams: unknown): Promise<string> {
    if (!this.provider || !this.capabilities) throw new Error('Wallet not connected');
    if (typeof this.provider.signAndBroadcast === 'function') {
      return await this.provider.signAndBroadcast(txParams as string);
    }
    const signedPsbt = await this.provider.signPsbt(txParams as string);
    return signedPsbt;
  }
}

export function detectAvailableBtcWallets(): { id: string; name: string; available: boolean }[] {
  const detected: { id: string; name: string; available: boolean }[] = [];
  if (typeof window === 'undefined') return detected;

  if (window.unisat) detected.push({ id: 'unisat', name: 'UniSat', available: true });
  if (window.okxwallet?.bitcoin) detected.push({ id: 'okx-btc', name: 'OKX Wallet (BTC)', available: true });
  if (window.xverse) detected.push({ id: 'xverse', name: 'Xverse', available: true });
  if (window.leather) detected.push({ id: 'leather', name: 'Leather', available: true });

  return detected;
}

export function getBitcoinAdapter(): BitcoinWalletAdapter | null {
  const adapter = new BitcoinWalletAdapter();
  return adapter.isAvailable() ? adapter : null;
}
