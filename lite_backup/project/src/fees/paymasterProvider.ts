export interface PaymasterProvider {
  name: string;
  supportsChain(chainId: number): boolean;
  supportsToken(chainId: number, tokenAddress: string): boolean;
  supportsAccountModel(accountModel: string): boolean;
  estimateTokenFee(chainId: number, tokenAddress: string): Promise<bigint>;
  prepareUserOperation(params: unknown): Promise<unknown>;
  sponsorUserOperation(params: unknown): Promise<unknown>;
  submitUserOperation(params: unknown): Promise<string>;
  verifySupportedMode(mode: string): boolean;
}

export interface PaymasterAvailability {
  provider: string;
  available: boolean;
  supportedChains: number[];
  supportedTokens: string[];
  accountModel: string;
  operational: boolean;
}

const providers: Map<string, PaymasterProvider> = new Map();

export function registerPaymasterProvider(name: string, provider: PaymasterProvider): void {
  providers.set(name, provider);
}

export function getPaymasterProvider(name: string): PaymasterProvider | undefined {
  return providers.get(name);
}

export function listPaymasterProviders(): string[] {
  return Array.from(providers.keys());
}

export function getPaymasterAvailability(): PaymasterAvailability[] {
  return Array.from(providers.entries()).map(([name, provider]) => {
    const supportedChains = getSupportedChainsForProvider(provider);
    return {
      provider: name,
      available: true,
      supportedChains,
      supportedTokens: [],
      accountModel: 'EOA',
      operational: supportedChains.length > 0,
    };
  });
}

function getSupportedChainsForProvider(_provider: PaymasterProvider): number[] {
  const knownChains = [1, 8453, 42161, 10, 137, 56, 43114];
  return knownChains.filter((c) => _provider.supportsChain(c));
}

export function isAnyPaymasterAvailable(): boolean {
  return providers.size > 0;
}

export function supportsChain(chainId: number): boolean {
  for (const provider of providers.values()) {
    if (provider.supportsChain(chainId)) return true;
  }
  return false;
}

export function supportsToken(chainId: number, tokenAddress: string): boolean {
  for (const provider of providers.values()) {
    if (provider.supportsToken(chainId, tokenAddress)) return true;
  }
  return false;
}
