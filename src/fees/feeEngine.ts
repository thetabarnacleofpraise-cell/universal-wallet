import type { FeeMode } from './feeMode';
import { getPaymasterProvider, listPaymasterProviders, supportsChain as paymasterSupportsChain, supportsToken as paymasterSupportsToken } from './paymasterProvider';
import { getNetwork } from '@/registry/networkRegistry';

export interface FeeContext {
  networkId: string;
  assetSymbol: string;
  assetContract: string | null;
  walletType: string;
  estimatedGasCost: bigint;
}

export interface FeeDecision {
  mode: FeeMode;
  feeToken: string | null;
  estimatedFee: bigint;
  netClaimAmount: bigint;
  requiresNativeGas: boolean;
  reason: string;
}

export function determineFeeMode(ctx: FeeContext): FeeDecision {
  const netDef = getNetwork(ctx.networkId);
  if (!netDef) {
    return nativeFallback(ctx, 'Unknown network');
  }

  if (netDef.engine !== 'EVM') {
    return nativeFallback(ctx, 'Non-EVM chain — native gas only');
  }

  const chainId = netDef.chainId;
  if (chainId === null) {
    return nativeFallback(ctx, 'No chain ID for network');
  }

  if (listPaymasterProviders().length > 0 && paymasterSupportsChain(chainId)) {
    if (ctx.assetContract && paymasterSupportsToken(chainId, ctx.assetContract)) {
      return {
        mode: 'TOKEN_PAYMASTER',
        feeToken: ctx.assetContract,
        estimatedFee: 0n,
        netClaimAmount: ctx.estimatedGasCost,
        requiresNativeGas: false,
        reason: 'ERC-4337 paymaster available with token-fee support for this asset',
      };
    }

    return {
      mode: 'SPONSORED',
      feeToken: null,
      estimatedFee: 0n,
      netClaimAmount: ctx.estimatedGasCost,
      requiresNativeGas: false,
      reason: 'ERC-4337 paymaster available — sponsored transaction',
    };
  }

  return nativeFallback(ctx, 'No paymaster configured for this chain');
}

function nativeFallback(ctx: FeeContext, reason: string): FeeDecision {
  return {
    mode: 'NATIVE',
    feeToken: null,
    estimatedFee: ctx.estimatedGasCost,
    netClaimAmount: ctx.estimatedGasCost,
    requiresNativeGas: true,
    reason,
  };
}

export function assertFeeDeductionSafe(
  grossAmount: bigint,
  feeAmount: bigint,
  mode: FeeMode,
): { safe: boolean; net: bigint; reason?: string } {
  if (mode === 'NATIVE') {
    return { safe: true, net: grossAmount, reason: 'Native gas — no deduction from claim amount' };
  }

  if (feeAmount > grossAmount) {
    return { safe: false, net: 0n, reason: 'Fee exceeds claim amount' };
  }

  if (mode === 'TOKEN_PAYMASTER' && feeAmount > 0n) {
    const net = grossAmount - feeAmount;
    if (net <= 0n) {
      return { safe: false, net: 0n, reason: 'Net claim amount would be zero or negative' };
    }
    return { safe: true, net };
  }

  return { safe: true, net: grossAmount };
}

export function isFeeAbstractionAvailable(networkId: string): boolean {
  const netDef = getNetwork(networkId);
  if (!netDef || netDef.chainId === null) return false;
  return paymasterSupportsChain(netDef.chainId);
}
