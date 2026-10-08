import { describe, it, expect } from 'vitest';
import { planEvmTransfer, buildEvmTransaction, verifyEvmTransaction, claimItemFromPlan } from '@/integration/evmTransferBuilder';
import { getAsset } from '@/registry/assetRegistry';

describe('evmTransferBuilder', () => {
  it('plans native ETH transfer', () => {
    const ethAsset = getAsset('eth-ethereum')!;
    const plan = planEvmTransfer(ethAsset, '1000000000000000000', '0xabc', 'NATIVE');
    expect(plan.asset).toBe('ETH');
    expect(plan.network).toBe('ethereum');
    expect(plan.value).toBe(1000000000000000000n);
    expect(plan.contractAddress).toBeNull();
    expect(plan.data).toBe('0x');
    expect(plan.feeMode).toBe('NATIVE');
  });

  it('plans ERC20 USDT transfer', () => {
    const usdtAsset = getAsset('usdt-bsc')!;
    const plan = planEvmTransfer(usdtAsset, '5000000', '0xabc', 'NATIVE');
    expect(plan.asset).toBe('USDT');
    expect(plan.network).toBe('bsc');
    expect(plan.value).toBe(0n);
    expect(plan.contractAddress).toBe('0x55d398326f99059fF775485246999027B3197955');
    expect(plan.data).not.toBe('0x');
    expect(plan.data).toMatch(/^0xa9059cbb/);
  });

  it('buildEvmTransaction produces valid tx request', () => {
    const ethAsset = getAsset('eth-ethereum')!;
    const plan = planEvmTransfer(ethAsset, '1000000', '0xabc');
    const tx = buildEvmTransaction(plan, 5, 1, 21000n, 20000000000n, 1000000000n);
    expect(tx.chainId).toBe(1);
    expect(tx.nonce).toBe(5);
    expect(tx.gasLimit).toBe(21000n);
    expect(tx.type).toBe(2);
  });

  it('verifyEvmTransaction rejects wrong chain ID', () => {
    const ethAsset = getAsset('eth-ethereum')!;
    const plan = planEvmTransfer(ethAsset, '1000000', '0xabc');
    const tx = buildEvmTransaction(plan, 0, 1, 21000n, 20000000000n, 1000000000n);
    expect(verifyEvmTransaction(tx, plan, 56)).toBe(false);
  });

  it('claimItemFromPlan produces correct ClaimItem', () => {
    const ethAsset = getAsset('eth-ethereum')!;
    const plan = planEvmTransfer(ethAsset, '1000000', '0xabc', 'NATIVE');
    const item = claimItemFromPlan(plan);
    expect(item.asset).toBe('ETH');
    expect(item.network).toBe('ethereum');
    expect(item.feeMode).toBe('NATIVE');
  });
});
