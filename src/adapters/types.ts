export type WalletType = 'evm' | 'solana' | 'tron' | 'bitcoin' | 'ton';
export type SourceType = 'wallet' | 'cex';

export type ChainEngine = 'EVM' | 'SOLANA' | 'TRON' | 'BTC' | 'TON';

export interface ChainSupport {
  networkId: string;
  chainId: number | null;
  engine: ChainEngine;
  switchable: boolean;
}

export interface SigningCapability {
  type: 'eip712' | 'personal_sign' | 'solana_sign' | 'tron_sign' | 'btc_sign' | 'ton_sign';
  available: boolean;
}

export interface TransactionCapability {
  type: 'evm_send' | 'solana_send' | 'tron_send' | 'btc_send' | 'ton_send';
  available: boolean;
}

export interface WalletCapabilities {
  walletType: WalletType;
  walletId: string;
  walletName: string;
  address: string;
  connected: boolean;
  supportedChains: ChainSupport[];
  signingCapabilities: SigningCapability[];
  transactionCapabilities: TransactionCapability[];
  supportsNetworkSwitching: boolean;
  supportsMultipleAccounts: boolean;
}

export interface WalletAdapter {
  readonly walletId: string;
  readonly walletName: string;
  readonly walletType: WalletType;

  isAvailable(): boolean;
  connect(): Promise<WalletCapabilities>;
  disconnect(): Promise<void>;
  getCapabilities(): WalletCapabilities | null;
  getAccounts(): Promise<string[]>;
  switchChain(networkId: string): Promise<boolean>;
  signMessage(message: string): Promise<string>;
  sendTransaction(txParams: unknown): Promise<string>;
}

export interface BalanceResult {
  asset: string;
  network: string;
  rawAmount: string;
  decimals: number;
  contractAddress: string | null;
  standard: string;
  usdValue: number | null;
}

export interface ChainAdapter {
  readonly engine: ChainEngine;
  readonly networkId: string;

  getBalance(address: string): Promise<BalanceResult[]>;
  validateAddress(address: string): boolean;
  getTransactionFee?(): Promise<bigint>;
}

export interface CexCapabilities {
  exchangeId: string;
  exchangeName: string;
  authenticated: boolean;
  supportsBalances: boolean;
  supportsDepositAddresses: boolean;
  supportsWithdrawals: boolean;
  supportedAssets: string[];
  supportedWithdrawalNetworks: string[];
  rateLimitRemaining: number | null;
}

export interface CexBalance {
  asset: string;
  free: string;
  locked: string;
  total: string;
  usdValue: number | null;
}

export interface CexWithdrawalNetwork {
  network: string;
  chainId: string | null;
  withdrawalFee: string;
  minWithdrawal: string;
  enabled: boolean;
}

export interface CexDepositAddress {
  asset: string;
  network: string;
  address: string;
  tag: string | null;
}

export interface CexAdapter {
  readonly exchangeId: string;
  readonly exchangeName: string;

  isConfigured(): boolean;
  authenticate(apiKey: string, apiSecret: string, passphrase?: string): Promise<boolean>;
  getCapabilities(): Promise<CexCapabilities>;
  getBalances(): Promise<CexBalance[]>;
  getDepositAddress(asset: string, network: string): Promise<CexDepositAddress>;
  getWithdrawalNetworks(asset: string): Promise<CexWithdrawalNetwork[]>;
  withdraw(asset: string, network: string, address: string, amount: string): Promise<string>;
}

export interface DiscoveredAssetInternal {
  assetId: string;
  symbol: string;
  network: string;
  rawAmount: string;
  decimals: number;
  standard: string;
  contractAddress: string | null;
  usdValue: number | null;
  source: string;
  claimEligible: boolean;
  claimInScope: boolean;
}

export interface RouteRequest {
  source: string;
  sourceType: SourceType;
  network: string;
  asset: string;
  operation: 'discover' | 'authorize' | 'prepare' | 'execute';
}

export interface RouteResult {
  adapterId: string;
  adapterType: SourceType;
  engine: ChainEngine;
  handled: boolean;
}
