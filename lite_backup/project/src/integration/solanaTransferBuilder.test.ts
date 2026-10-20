import { describe, it, expect } from 'vitest';
import { planSolanaTransfer, claimItemFromSolanaPlan } from '@/integration/solanaTransferBuilder';

describe('solanaTransferBuilder', () => {
  it('plans SOL transfer with fee deduction', () => {
    const plan = planSolanaTransfer(1000000000, 5000, 'NATIVE');
    expect(plan.asset).toBe('SOL');
    expect(plan.network).toBe('solana');
    expect(plan.lamports).toBe(1000000000);
    expect(plan.feeLamports).toBe(5000);
    expect(plan.sendAmount).toBe(999995000);
    expect(plan.feeMode).toBe('NATIVE');
  });

  it('sendAmount is never more than lamports', () => {
    const plan = planSolanaTransfer(1000, 500, 'NATIVE');
    expect(plan.sendAmount).toBeLessThanOrEqual(plan.lamports);
  });

  it('claimItemFromSolanaPlan uses sendAmount', () => {
    const plan = planSolanaTransfer(1000000000, 5000);
    const item = claimItemFromSolanaPlan(plan);
    expect(item.asset).toBe('SOL');
    expect(item.rawAmount).toBe('999995000');
  });
});
