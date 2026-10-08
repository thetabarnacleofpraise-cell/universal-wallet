import type { WalletAdapter, WalletCapabilities, WalletType } from '../adapters/types';
import { EvmWalletAdapter, detectAvailableEvmWallets, getEvmAdapter } from '../adapters/evmWalletAdapter';
import { SolanaWalletAdapter, detectAvailableSolanaWallets, getSolanaAdapter } from '../adapters/solanaWalletAdapter';
import { TronWalletAdapter, detectAvailableTronWallets, getTronAdapter } from '../adapters/tronWalletAdapter';
import { BitcoinWalletAdapter, detectAvailableBtcWallets, getBitcoinAdapter } from '../adapters/bitcoinWalletAdapter';
import { TonWalletAdapter, detectAvailableTonWallets, getTonAdapter } from '../adapters/tonWalletAdapter';

export interface DetectedWallet {
  id: string;
  name: string;
  type: WalletType;
  available: boolean;
}

export interface ConnectedWallet {
  adapter: WalletAdapter;
  capabilities: WalletCapabilities;
}

export class WalletController {
  private connected: ConnectedWallet | null = null;

  detectAllWallets(): DetectedWallet[] {
    const all: DetectedWallet[] = [];

    for (const w of detectAvailableEvmWallets()) {
      all.push({ id: w.id, name: w.name, type: 'evm', available: w.available });
    }
    for (const w of detectAvailableSolanaWallets()) {
      all.push({ id: w.id, name: w.name, type: 'solana', available: w.available });
    }
    for (const w of detectAvailableTronWallets()) {
      all.push({ id: w.id, name: w.name, type: 'tron', available: w.available });
    }
    for (const w of detectAvailableBtcWallets()) {
      all.push({ id: w.id, name: w.name, type: 'bitcoin', available: w.available });
    }
    for (const w of detectAvailableTonWallets()) {
      all.push({ id: w.id, name: w.name, type: 'ton', available: w.available });
    }

    return all;
  }

  detectWalletsByType(type: WalletType): DetectedWallet[] {
    return this.detectAllWallets().filter((w) => w.type === type);
  }

  getAdapter(type: WalletType, walletId?: string): WalletAdapter | null {
    switch (type) {
      case 'evm':
        return getEvmAdapter(walletId);
      case 'solana':
        return getSolanaAdapter();
      case 'tron':
        return getTronAdapter();
      case 'bitcoin':
        return getBitcoinAdapter();
      case 'ton':
        return getTonAdapter();
      default:
        return null;
    }
  }

  async connect(type: WalletType, walletId?: string): Promise<ConnectedWallet> {
    const adapter = this.getAdapter(type, walletId);
    if (!adapter) throw new Error(`No ${type} wallet available`);
    if (!adapter.isAvailable()) throw new Error(`${type} wallet not detected`);

    const capabilities = await adapter.connect();

    this.connected = { adapter, capabilities };
    return this.connected;
  }

  async connectFirstAvailable(): Promise<ConnectedWallet> {
    const detected = this.detectAllWallets();

    const evmWallets = detected.filter((w) => w.type === 'evm');
    if (evmWallets.length > 0) {
      try { return await this.connect('evm', evmWallets[0].id); } catch {}
    }

    for (const w of detected) {
      if (w.type === 'evm') continue;
      try { return await this.connect(w.type, w.id); } catch {}
    }

    throw new Error('No compatible wallet found');
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.connected.adapter.disconnect();
      this.connected = null;
    }
  }

  getConnected(): ConnectedWallet | null {
    return this.connected;
  }

  getAddress(): string | null {
    return this.connected?.capabilities.address ?? null;
  }

  getCapabilities(): WalletCapabilities | null {
    return this.connected?.capabilities ?? null;
  }

  supportsChain(networkId: string): boolean {
    if (!this.connected) return false;
    return this.connected.capabilities.supportedChains.some((c) => c.networkId === networkId);
  }

  supportsSigning(signType: string): boolean {
    if (!this.connected) return false;
    return this.connected.capabilities.signingCapabilities.some((s) => s.type === signType && s.available);
  }

  supportsTransactions(txType: string): boolean {
    if (!this.connected) return false;
    return this.connected.capabilities.transactionCapabilities.some((t) => t.type === txType && t.available);
  }

  async switchChain(networkId: string): Promise<boolean> {
    if (!this.connected) return false;
    return await this.connected.adapter.switchChain(networkId);
  }

  async signMessage(message: string): Promise<string> {
    if (!this.connected) throw new Error('No wallet connected');
    return await this.connected.adapter.signMessage(message);
  }

  async sendTransaction(txParams: unknown): Promise<string> {
    if (!this.connected) throw new Error('No wallet connected');
    return await this.connected.adapter.sendTransaction(txParams);
  }

  async signTypedData(typedData: string): Promise<string> {
    if (!this.connected) throw new Error('No wallet connected');
    if (this.connected.adapter instanceof EvmWalletAdapter) {
      return await this.connected.adapter.signTypedData(typedData);
    }
    throw new Error('Connected wallet does not support typed data signing');
  }

  getWalletType(): WalletType | null {
    return this.connected?.capabilities.walletType ?? null;
  }

  getWalletName(): string | null {
    return this.connected?.capabilities.walletName ?? null;
  }
}

export const walletController = new WalletController();
