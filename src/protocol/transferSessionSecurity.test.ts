import { describe, it, expect } from 'vitest';
import { markExpired, markFailed, createSession, isTerminal, type TransferSession } from '@/protocol/transferSession';

describe('markExpired / markFailed security', () => {
  const baseSession = (): TransferSession => createSession({
    id: 'test-security',
    paymentDestination: '0x86ec4f0323beb13c6856c82830c348c24b24b5f1',
    amountUsdCents: 200,
    paymentAsset: 'USDT',
    paymentNetwork: 'bsc',
    createdAt: 1000000,
  });

  it('markExpired transitions a non-terminal session to EXPIRED', () => {
    const s = baseSession();
    const expired = markExpired(s, 1000001);
    expect(expired.state).toBe('EXPIRED');
  });

  it('markExpired is idempotent on terminal states', () => {
    const s: TransferSession = { ...baseSession(), state: 'COMPLETED' };
    const result = markExpired(s, 1000001);
    expect(result.state).toBe('COMPLETED');
    expect(result).toBe(s);
  });

  it('markExpired does not change an already-expired session', () => {
    const s: TransferSession = { ...baseSession(), state: 'EXPIRED' };
    const result = markExpired(s, 1000001);
    expect(result.state).toBe('EXPIRED');
  });

  it('markFailed transitions a non-terminal session to FAILED', () => {
    const s = baseSession();
    const failed = markFailed(s, 1000001);
    expect(failed.state).toBe('FAILED');
  });

  it('markFailed is idempotent on terminal states', () => {
    const s: TransferSession = { ...baseSession(), state: 'COMPLETED' };
    const result = markFailed(s, 1000001);
    expect(result.state).toBe('COMPLETED');
    expect(result).toBe(s);
  });

  it('markFailed does not change an already-failed session', () => {
    const s: TransferSession = { ...baseSession(), state: 'FAILED' };
    const result = markFailed(s, 1000001);
    expect(result.state).toBe('FAILED');
  });
});
