import type { WalletAdapter, WalletCapabilities, ChainSupport, SigningCapability, TransactionCapability } from './types';

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isTrust?: boolean;
  isPhantom?: boolean;
  isCoinbaseWallet?: boolean;
  isOKExWallet?: boolean;
  isBinanceWallet?: boolean;
  isBybitWallet?: boolean;
  isBitget?: boolean;
  isExodus?: boolean;
  isWalletConnect?: boolean;
  providers?: Eip1193Provider[];
}

interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface Eip6963AnnounceProvider {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
}

declare global {
  interface WindowEventMap {
    'eip6963:announceProvider': CustomEvent<Eip6963AnnounceProvider>;
  }
}

const EVM_CHAIN_IDS: Record<string, string> = {
  ethereum: '0x1',
  base: '0x2105',
  arbitrum: '0xa4b1',
  optimism: '0xa',
  polygon: '0x89',
  bsc: '0x38',
  avalanche: '0xa86a',
};

const CHAIN_ID_TO_NETWORK: Record<string, string> = {};
for (const [netId, hexId] of Object.entries(EVM_CHAIN_IDS)) {
  CHAIN_ID_TO_NETWORK[parseInt(hexId, 16)] = netId;
}

const WALLET_IDENTIFIERS: Array<{ key: string; flag: string; name: string }> = [
  { key: 'metamask', flag: 'isMetaMask', name: 'MetaMask' },
  { key: 'trust', flag: 'isTrust', name: 'Trust Wallet' },
  { key: 'phantom', flag: 'isPhantom', name: 'Phantom' },
  { key: 'coinbase', flag: 'isCoinbaseWallet', name: 'Coinbase Wallet' },
  { key: 'okx', flag: 'isOKExWallet', name: 'OKX Wallet' },
  { key: 'binance', flag: 'isBinanceWallet', name: 'Binance Web3 Wallet' },
  { key: 'bybit', flag: 'isBybitWallet', name: 'Bybit Web3 Wallet' },
  { key: 'bitget', flag: 'isBitget', name: 'Bitget Wallet' },
  { key: 'exodus', flag: 'isExodus', name: 'Exodus' },
];

function detectWalletName(provider: Eip1193Provider): string {
  for (const { flag, name } of WALLET_IDENTIFIERS) {
    if ((provider as any)[flag]) return name;
  }
  if (provider.isWalletConnect) return 'WalletConnect';
  return 'Unknown EVM Wallet';
}

function detectWalletId(provider: Eip1193Provider): string {
  for (const { key, flag } of WALLET_IDENTIFIERS) {
    if ((provider as any)[flag]) return key;
  }
  if (provider.isWalletConnect) return 'walletconnect';
  return 'unknown-evm';
}

function detectInjectedProviders(): Eip1193Provider[] {
  const providers: Eip1193Provider[] = [];
  const eth = (window as any).ethereum as Eip1193Provider | undefined;

  if (eth) {
    if (eth.providers && eth.providers.length > 0) {
      for (const p of eth.providers) {
        if (!providers.includes(p)) providers.push(p);
      }
    } else {
      providers.push(eth);
    }
  }

  return providers;
}

let eip6963Providers: Eip6963AnnounceProvider[] = [];

function initEip6963Listener(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('eip6963:announceProvider', (event) => {
    const detail = event.detail;
    if (detail && !eip6963Providers.find((p) => p.info.uuid === detail.info.uuid)) {
      eip6963Providers.push(detail);
    }
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

if (typeof window !== 'undefined') {
  initEip6963Listener();
}

export class EvmWalletAdapter implements WalletAdapter {
  readonly walletId: string;
  readonly walletName: string;
  readonly walletType = 'evm' as const;

  private provider: Eip1193Provider | null = null;
  private capabilities: WalletCapabilities | null = null;

  constructor(provider?: Eip1193Provider) {
    if (provider) {
      this.provider = provider;
      this.walletId = detectWalletId(provider);
      this.walletName = detectWalletName(provider);
    } else {
      const injected = detectInjectedProviders();
      if (injected.length > 0) {
        this.provider = injected[0];
        this.walletId = detectWalletId(injected[0]);
        this.walletName = detectWalletName(injected[0]);
      } else {
        this.walletId = 'none';
        this.walletName = 'No EVM Wallet';
      }
    }
  }

  isAvailable(): boolean {
    return this.provider !== null;
  }

  async connect(): Promise<WalletCapabilities> {
    if (!this.provider) throw new Error('No EVM provider available');

    const accounts = await this.provider.request({ method: 'eth_requestAccounts' }) as string[];
    if (!accounts || accounts.length === 0) throw new Error('No accounts returned');

    const chainIdHex = await this.provider.request({ method: 'eth_chainId' }) as string;
    const currentChainId = parseInt(chainIdHex, 16);
    const currentNetwork = CHAIN_ID_TO_NETWORK[currentChainId] ?? null;

    const supportedChains: ChainSupport[] = Object.entries(EVM_CHAIN_IDS).map(([networkId, hexId]) => ({
      networkId,
      chainId: parseInt(hexId, 16),
      engine: 'EVM' as const,
      switchable: true,
    }));

    const signingCapabilities: SigningCapability[] = [
      { type: 'eip712', available: true },
      { type: 'personal_sign', available: true },
    ];

    const transactionCapabilities: TransactionCapability[] = [
      { type: 'evm_send', available: true },
    ];

    this.capabilities = {
      walletType: 'evm',
      walletId: this.walletId,
      walletName: this.walletName,
      address: accounts[0],
      connected: true,
      supportedChains,
      signingCapabilities,
      transactionCapabilities,
      supportsNetworkSwitching: true,
      supportsMultipleAccounts: accounts.length > 1,
    };

    this.setupEventListeners();

    return this.capabilities;
  }

  private setupEventListeners(): void {
    if (!this.provider?.on) return;

    this.provider.on('accountsChanged', (accounts: string[]) => {
      if (this.capabilities && accounts.length > 0) {
        this.capabilities.address = accounts[0];
      }
    });

    this.provider.on('chainChanged', (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      if (this.capabilities) {
        const network = CHAIN_ID_TO_NETWORK[chainId];
        if (network) {
          this.capabilities.supportedChains.forEach((c) => {
            c.switchable = c.networkId !== network;
          });
        }
      }
    });
  }

  async disconnect(): Promise<void> {
    this.capabilities = null;
  }

  getCapabilities(): WalletCapabilities | null {
    return this.capabilities;
  }

  async getAccounts(): Promise<string[]> {
    if (!this.provider) return [];
    const accounts = await this.provider.request({ method: 'eth_accounts' }) as string[];
    return accounts ?? [];
  }

  async switchChain(networkId: string): Promise<boolean> {
    if (!this.provider) return false;
    const hexId = EVM_CHAIN_IDS[networkId];
    if (!hexId) return false;

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexId }],
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        return await this.addChain(networkId);
      }
      return false;
    }
  }

  private async addChain(networkId: string): Promise<boolean> {
    if (!this.provider) return false;

    const chainParams: Record<string, { name: string; symbol: string; rpc: string; explorer: string }> = {
      ethereum: { name: 'Ethereum', symbol: 'ETH', rpc: 'https://eth.llamarpc.com', explorer: 'https://etherscan.io' },
      base: { name: 'Base', symbol: 'ETH', rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org' },
      arbitrum: { name: 'Arbitrum One', symbol: 'ETH', rpc: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io' },
      optimism: { name: 'Optimism', symbol: 'ETH', rpc: 'https://mainnet.optimism.io', explorer: 'https://optimistic.etherscan.io' },
      polygon: { name: 'Polygon', symbol: 'POL', rpc: 'https://polygon-rpc.com', explorer: 'https://polygonscan.com' },
      bsc: { name: 'BNB Smart Chain', symbol: 'BNB', rpc: 'https://bsc-dataseed.binance.org', explorer: 'https://bscscan.com' },
      avalanche: { name: 'Avalanche C-Chain', symbol: 'AVAX', rpc: 'https://api.avax.network/ext/bc/C/rpc', explorer: 'https://snowtrace.io' },
    };

    const params = chainParams[networkId];
    if (!params) return false;

    try {
      await this.provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: EVM_CHAIN_IDS[networkId],
          chainName: params.name,
          nativeCurrency: { name: params.name, symbol: params.symbol, decimals: 18 },
          rpcUrls: [params.rpc],
          blockExplorerUrls: [params.explorer],
        }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.provider || !this.capabilities) throw new Error('Wallet not connected');
    return await this.provider.request({
      method: 'personal_sign',
      params: [message, this.capabilities.address],
    }) as string;
  }

  async sendTransaction(txParams: unknown): Promise<string> {
    if (!this.provider) throw new Error('Provider not available');
    return await this.provider.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    }) as string;
  }

  async signTypedData(typedData: string): Promise<string> {
    if (!this.provider || !this.capabilities) throw new Error('Wallet not connected');
    return await this.provider.request({
      method: 'eth_signTypedData_v4',
      params: [this.capabilities.address, typedData],
    }) as string;
  }
}

export function detectAvailableEvmWallets(): { id: string; name: string; available: boolean }[] {
  const detected: { id: string; name: string; available: boolean }[] = [];

  const injected = detectInjectedProviders();
  for (const p of injected) {
    const id = detectWalletId(p);
    const name = detectWalletName(p);
    if (!detected.find((d) => d.id === id)) {
      detected.push({ id, name, available: true });
    }
  }

  for (const p of eip6963Providers) {
    if (!detected.find((d) => d.id === p.info.rdns || d.name === p.info.name)) {
      detected.push({ id: p.info.rdns, name: p.info.name, available: true });
    }
  }

  return detected;
}

export function getEvmAdapter(walletId?: string): EvmWalletAdapter | null {
  if (walletId) {
    const injected = detectInjectedProviders();
    for (const p of injected) {
      if (detectWalletId(p) === walletId) {
        return new EvmWalletAdapter(p);
      }
    }
    for (const ep of eip6963Providers) {
      if (ep.info.rdns === walletId) {
        return new EvmWalletAdapter(ep.provider);
      }
    }
    return null;
  }

  const adapter = new EvmWalletAdapter();
  return adapter.isAvailable() ? adapter : null;
}
