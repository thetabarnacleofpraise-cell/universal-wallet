import { describe, it, expect, beforeEach } from 'vitest';
import { determineFeeMode, assertFeeDeductionSafe, isFeeAbstractionAvailable, type FeeContext } from '@/fees/feeEngine';
import { registerPaymasterProvider, listPaymasterProviders } from '@/fees/paymasterProvider';
import type { PaymasterProvider } from '@/fees/paymasterProvider';

const mockProvider: PaymasterProvider = {
  name: 'TestPaymaster',
  supportsChain: (chainId: number) => chainId === 1 || chainId === 56,
  supportsToken: (chainId: number, tokenAddress: string) =>
    chainId === 1 && tokenAddress.toLowerCase() === '0xdac17f958d2ee523a2206206994597c13d831ec7',
  supportsAccountModel: (m: string) => m === 'EOA',
  async estimateTokenFee() { return 1000n; },
  async prepareUserOperation() { return {}; },
  async sponsorUserOperation() { return {}; },
  async submitUserOperation() { return '0xhash'; },
  verifySupportedMode: (m: string) => m === 'SPONSORED' || m === 'TOKEN_PAYMASTER',
};

describe('feeEngine', () => {
  beforeEach(() => {
    // Clear providers by checking — providers map is module-level
    // We register only for specific tests
  });

  it('returns NATIVE for unknown network', () => {
    const ctx: FeeContext = {
      networkId: 'nonexistent',
      assetSymbol: 'ETH',
      assetContract: null,
      walletType: 'evm',
      estimatedGasCost: 21000n,
    };
    const decision = determineFeeMode(ctx);
    expect(decision.mode).toBe('NATIVE');
    expect(decision.requiresNativeGas).toBe(true);
  });

  it('returns NATIVE for non-EVM chain (Solana)', () => {
    const ctx: FeeContext = {
      networkId: 'solana',
      assetSymbol: 'SOL',
      assetContract: null,
      walletType: 'solana',
      estimatedGasCost: 5000n,
    };
    const decision = determineFeeMode(ctx);
    expect(decision.mode).toBe('NATIVE');
    expect(decision.requiresNativeGas).toBe(true);
    expect(decision.reason).toContain('Non-EVM');
  });

  it('returns NATIVE for non-EVM chain (Bitcoin)', () => {
    const ctx: FeeContext = {
      networkId: 'bitcoin',
      assetSymbol: 'BTC',
      assetContract: null,
      walletType: 'bitcoin',
      estimatedGasCost: 1000n,
    };
    const decision = determineFeeMode(ctx);
    expect(decision.mode).toBe('NATIVE');
  });

  it('returns NATIVE for non-EVM chain (TRON)', () => {
    const ctx: FeeContext = {
      networkId: 'tron',
      assetSymbol: 'USDT',
      assetContract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      walletType: 'tron',
      estimatedGasCost: 1000000n,
    };
    const decision = determineFeeMode(ctx);
    expect(decision.mode).toBe('NATIVE');
  });

  it('returns NATIVE for EVM chain with no paymaster configured', () => {
    const ctx: FeeContext = {
      networkId: 'ethereum',
      assetSymbol: 'ETH',
      assetContract: null,
      walletType: 'evm',
      estimatedGasCost: 21000n,
    };
    const decision = determineFeeMode(ctx);
    expect(decision.mode).toBe('NATIVE');
    expect(decision.requiresNativeGas).toBe(true);
    expect(decision.reason).toContain('No paymaster');
  });

  it('returns SPONSORED when paymaster is configured but token not supported', () => {
    registerPaymasterProvider('TestPaymaster', mockProvider);
    const ctx: FeeContext = {
      networkId: 'ethereum',
      assetSymbol: 'ETH',
      assetContract: null,
      walletType: 'evm',
      estimatedGasCost: 21000n,
    };
    const decision = determineFeeMode(ctx);
    expect(decision.mode).toBe('SPONSORED');
    expect(decision.requiresNativeGas).toBe(false);
    expect(listPaymasterProviders()).toContain('TestPaymaster');
  });

  it('returns TOKEN_PAYMASTER when paymaster supports the token', () => {
    registerPaymasterProvider('TestPaymaster', mockProvider);
    const ctx: FeeContext = {
      networkId: 'ethereum',
      assetSymbol: 'USDT',
      assetContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      walletType: 'evm',
      estimatedGasCost: 50000n,
    };
    const decision = determineFeeMode(ctx);
    expect(decision.mode).toBe('TOKEN_PAYMASTER');
    expect(decision.requiresNativeGas).toBe(false);
    expect(decision.feeToken).toBe('0xdAC17F958D2ee523a2206206994597C13D831ec7');
  });

  it('returns NATIVE when paymaster does not support the chain', () => {
    registerPaymasterProvider('TestPaymaster', mockProvider);
    const ctx: FeeContext = {
      networkId: 'polygon',
      assetSymbol: 'USDC',
      assetContract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      walletType: 'evm',
      estimatedGasCost: 50000n,
    };
    const decision = determineFeeMode(ctx);
    expect(decision.mode).toBe('NATIVE');
  });

  it('isFeeAbstractionAvailable reflects paymaster config', () => {
    registerPaymasterProvider('TestPaymaster', mockProvider);
    expect(isFeeAbstractionAvailable('ethereum')).toBe(true);
    expect(isFeeAbstractionAvailable('bsc')).toBe(true);
    expect(isFeeAbstractionAvailable('polygon')).toBe(false);
    expect(isFeeAbstractionAvailable('bitcoin')).toBe(false);
  });
});

describe('assertFeeDeductionSafe', () => {
  it('NATIVE mode does not deduct from claim amount', () => {
    const result = assertFeeDeductionSafe(1000000n, 21000n, 'NATIVE');
    expect(result.safe).toBe(true);
    expect(result.net).toBe(1000000n);
  });

  it('TOKEN_PAYMASTER deducts fee from gross', () => {
    const result = assertFeeDeductionSafe(1000000n, 1000n, 'TOKEN_PAYMASTER');
    expect(result.safe).toBe(true);
    expect(result.net).toBe(999000n);
  });

  it('rejects when fee exceeds gross amount', () => {
    const result = assertFeeDeductionSafe(500n, 1000n, 'TOKEN_PAYMASTER');
    expect(result.safe).toBe(false);
    expect(result.net).toBe(0n);
  });

  it('rejects when net would be zero', () => {
    const result = assertFeeDeductionSafe(1000n, 1000n, 'TOKEN_PAYMASTER');
    expect(result.safe).toBe(false);
  });

  it('SPONSORED mode does not deduct', () => {
    const result = assertFeeDeductionSafe(1000000n, 0n, 'SPONSORED');
    expect(result.safe).toBe(true);
    expect(result.net).toBe(1000000n);
  });
});
