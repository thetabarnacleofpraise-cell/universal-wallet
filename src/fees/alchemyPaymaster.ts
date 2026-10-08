import type { PaymasterProvider } from '@/fees/paymasterProvider';
import { registerPaymasterProvider } from '@/fees/paymasterProvider';

const ALCHEMY_SUPPORTED_CHAINS = new Set<number>([1, 8453, 42161, 10, 137, 56, 43114]);

const ALCHEMY_POLICY_IDS_ENV = 'ALCHEMY_PAYMASTER_POLICY_IDS';

interface AlchemyPolicyConfig {
  [chainId: number]: {
    policyId: string;
    feeTokens: string[];
  };
}

function getPolicyConfig(): AlchemyPolicyConfig | null {
  const raw = (import.meta as any).env?.[ALCHEMY_POLICY_IDS_ENV];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AlchemyPolicyConfig;
  } catch {
    return null;
  }
}

function getAlchemyApiKey(): string | null {
  return (import.meta as any).env?.['ALCHEMY_AA_API_KEY'] ?? null;
}

class AlchemyPaymaster implements PaymasterProvider {
  readonly name = 'Alchemy';

  private getPolicyId(chainId: number): string | null {
    const config = getPolicyConfig();
    if (!config) return null;
    return config[chainId]?.policyId ?? null;
  }

  supportsChain(chainId: number): boolean {
    if (!ALCHEMY_SUPPORTED_CHAINS.has(chainId)) return false;
    return getPolicyConfig() !== null && this.getPolicyId(chainId) !== null;
  }

  supportsToken(chainId: number, tokenAddress: string): boolean {
    const config = getPolicyConfig();
    if (!config) return false;
    const entry = config[chainId];
    if (!entry) return false;
    return entry.feeTokens.some(
      (t) => t.toLowerCase() === tokenAddress.toLowerCase(),
    );
  }

  supportsAccountModel(accountModel: string): boolean {
    return accountModel === 'EOA' || accountModel === 'SmartAccount';
  }

  async estimateTokenFee(chainId: number, tokenAddress: string): Promise<bigint> {
    if (!this.supportsToken(chainId, tokenAddress)) return 0n;
    const apiKey = getAlchemyApiKey();
    if (!apiKey) return 0n;

    try {
      const res = await fetch(`https://api.g.alchemy.com/data/v1/${apiKey}/paymaster/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId,
          tokenAddress,
          policyId: this.getPolicyId(chainId),
        }),
      });
      if (!res.ok) return 0n;
      const data = await res.json();
      const fee = data?.estimatedFee;
      if (typeof fee === 'string') return BigInt(fee);
      if (typeof fee === 'number') return BigInt(Math.floor(fee));
      return 0n;
    } catch {
      return 0n;
    }
  }

  async prepareUserOperation(params: unknown): Promise<unknown> {
    const apiKey = getAlchemyApiKey();
    if (!apiKey) throw new Error('Alchemy API key not configured (ALCHEMY_AA_API_KEY)');

    const p = params as { chainId: number; entryPoint: string; sender: string; callData: string; nonce: string };
    if (!p?.chainId) throw new Error('Missing chainId in userOperation params');
    if (!this.supportsChain(p.chainId)) {
      throw new Error(`Alchemy paymaster not configured for chain ${p.chainId}`);
    }

    const policyId = this.getPolicyId(p.chainId);
    if (!policyId) throw new Error(`No policy ID for chain ${p.chainId}`);

    const res = await fetch(`https://api.g.alchemy.com/data/v1/${apiKey}/paymaster/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...p,
        policyId,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alchemy prepareUserOperation failed: ${err}`);
    }
    return await res.json();
  }

  async sponsorUserOperation(params: unknown): Promise<unknown> {
    const apiKey = getAlchemyApiKey();
    if (!apiKey) throw new Error('Alchemy API key not configured (ALCHEMY_AA_API_KEY)');

    const p = params as { chainId: number };
    if (!p?.chainId || !this.supportsChain(p.chainId)) {
      throw new Error(`Alchemy paymaster not available for chain ${p?.chainId}`);
    }

    const res = await fetch(`https://api.g.alchemy.com/data/v1/${apiKey}/paymaster/sponsor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alchemy sponsorUserOperation failed: ${err}`);
    }
    return await res.json();
  }

  async submitUserOperation(params: unknown): Promise<string> {
    const apiKey = getAlchemyApiKey();
    if (!apiKey) throw new Error('Alchemy API key not configured (ALCHEMY_AA_API_KEY)');

    const p = params as { chainId: number };
    if (!p?.chainId || !this.supportsChain(p.chainId)) {
      throw new Error(`Alchemy paymaster not available for chain ${p?.chainId}`);
    }

    const res = await fetch(`https://api.g.alchemy.com/data/v1/${apiKey}/bundler/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alchemy submitUserOperation failed: ${err}`);
    }
    const data = await res.json();
    return data?.userOpHash ?? data?.hash ?? '';
  }

  verifySupportedMode(mode: string): boolean {
    return mode === 'SPONSORED' || mode === 'TOKEN_PAYMASTER';
  }
}

export const alchemyPaymaster: PaymasterProvider = new AlchemyPaymaster();

export function isAlchemyPaymasterAvailable(): boolean {
  return getPolicyConfig() !== null && getAlchemyApiKey() !== null;
}

export function registerAlchemyPaymasterIfConfigured(): void {
  if (isAlchemyPaymasterAvailable()) {
    registerPaymasterProvider('Alchemy', alchemyPaymaster);
  }
}
