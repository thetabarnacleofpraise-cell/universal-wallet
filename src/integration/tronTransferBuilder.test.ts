import { describe, it, expect } from 'vitest';
import { planTronTransfer, claimItemFromTronPlan } from '@/integration/tronTransferBuilder';

describe('tronTransferBuilder', () => {
  it('plans USDT TRC20 transfer on TRON', () => {
    const plan = planTronTransfer('USDT', 'tron', '1000000', 'NATIVE');
    expect(plan.asset).toBe('USDT');
    expect(plan.network).toBe('tron');
    expect(plan.contractAddress).toBe('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
    expect(plan.feeMode).toBe('NATIVE');
  });

  it('claimItemFromTronPlan preserves fields', () => {
    const plan = planTronTransfer('USDT', 'tron', '500000', 'NATIVE');
    const item = claimItemFromTronPlan(plan);
    expect(item.asset).toBe('USDT');
    expect(item.network).toBe('tron');
    expect(item.rawAmount).toBe('500000');
  });
});
