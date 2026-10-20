import { describe, it, expect } from 'vitest';
import { planBtcTransfer, claimItemFromBtcPlan, type BtcUtxo } from '@/integration/btcTransferBuilder';

describe('btcTransferBuilder', () => {
  const utxos: BtcUtxo[] = [
    { txid: 'abc', vout: 0, value: 50000, scriptPubKey: '0014...' },
    { txid: 'def', vout: 1, value: 30000, scriptPubKey: '0014...' },
  ];

  it('plans BTC transfer with fee deduction', () => {
    const plan = planBtcTransfer(utxos, '1dest', 10, 'NATIVE');
    expect(plan.asset).toBe('BTC');
    expect(plan.network).toBe('bitcoin');
    expect(plan.totalSatoshis).toBe(80000);
    expect(plan.fee).toBeGreaterThan(0);
    expect(plan.sendAmount).toBe(80000 - plan.fee);
    expect(plan.feeMode).toBe('NATIVE');
  });

  it('sendAmount is never more than totalSatoshis', () => {
    const plan = planBtcTransfer(utxos, '1dest', 100, 'NATIVE');
    expect(plan.sendAmount).toBeLessThanOrEqual(plan.totalSatoshis);
  });

  it('claimItemFromBtcPlan uses sendAmount', () => {
    const plan = planBtcTransfer(utxos, '1dest', 10);
    const item = claimItemFromBtcPlan(plan);
    expect(item.asset).toBe('BTC');
    expect(Number(item.rawAmount)).toBe(plan.sendAmount);
  });
});
