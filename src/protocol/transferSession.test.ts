import { describe, it, expect } from 'vitest';
import {
  createSession,
  transition,
  markPaymentVerified,
  markCompleted,
  canTransition,
  isTerminal,
  isExpired,
  timeRemaining,
  REQUEST_TTL_MS,
  CLAIM_WINDOW_MS,
  HANDSHAKE_USD_CENTS,
  type TransferSession,
} from '@/protocol/transferSession';

describe('transferSession', () => {
  const baseSession = (): TransferSession => createSession({
    id: 'test-session',
    paymentDestination: '0x86ec4f0323beb13c6856c82830c348c24b24b5f1',
    amountUsdCents: HANDSHAKE_USD_CENTS,
    paymentAsset: 'USDT',
    paymentNetwork: 'bsc',
    createdAt: 1000000,
  });

  it('creates session with correct defaults', () => {
    const s = baseSession();
    expect(s.id).toBe('test-session');
    expect(s.state).toBe('CREATED');
    expect(s.source).toBeNull();
    expect(s.payment.destination).toBe('0x86ec4f0323beb13c6856c82830c348c24b24b5f1');
    expect(s.payment.amountUsdCents).toBe(200);
    expect(s.payment.verified).toBe(false);
    expect(s.payment.consumedTxIds).toEqual([]);
    expect(s.expiresAt).toBe(1000000 + REQUEST_TTL_MS);
    expect(s.claimExpiresAt).toBeNull();
    expect(s.used).toBe(false);
  });

  it('REQUEST_TTL_MS is 6 hour', () => {
    expect(REQUEST_TTL_MS).toBe(21600000);
  });

  it('CLAIM_WINDOW_MS is 6 hours', () => {
    expect(CLAIM_WINDOW_MS).toBe(21600000);
  });

  it('HANDSHAKE_USD_CENTS is $2.00', () => {
    expect(HANDSHAKE_USD_CENTS).toBe(200);
  });

  it('valid state transitions', () => {
    expect(canTransition('CREATED', 'SCANNED')).toBe(true);
    expect(canTransition('SCANNED', 'PAYMENT_PENDING')).toBe(true);
    expect(canTransition('PAYMENT_PENDING', 'PAYMENT_VERIFIED')).toBe(true);
    expect(canTransition('PAYMENT_VERIFIED', 'AUTHORIZED')).toBe(true);
    expect(canTransition('AUTHORIZED', 'CLAIM_READY')).toBe(true);
    expect(canTransition('CLAIM_READY', 'CLAIMING')).toBe(true);
    expect(canTransition('CLAIMING', 'COMPLETED')).toBe(true);
  });

  it('invalid state transitions', () => {
    expect(canTransition('CREATED', 'COMPLETED')).toBe(false);
    expect(canTransition('CREATED', 'AUTHORIZED')).toBe(false);
    expect(canTransition('COMPLETED', 'CREATED')).toBe(false);
    expect(canTransition('PAYMENT_VERIFIED', 'CLAIMING')).toBe(false);
  });

  it('transition throws on invalid transition', () => {
    const s = baseSession();
    expect(() => transition(s, 'COMPLETED', 1000001)).toThrow();
  });

  it('transition throws from terminal state', () => {
    const s: TransferSession = { ...baseSession(), state: 'COMPLETED' };
    expect(() => transition(s, 'CREATED', 1000001)).toThrow();
  });

  it('isTerminal', () => {
    expect(isTerminal('COMPLETED')).toBe(true);
    expect(isTerminal('EXPIRED')).toBe(true);
    expect(isTerminal('FAILED')).toBe(true);
    expect(isTerminal('CREATED')).toBe(false);
    expect(isTerminal('PAYMENT_VERIFIED')).toBe(false);
  });

  it('markPaymentVerified sets claimExpiresAt', () => {
    const s = transition(baseSession(), 'PAYMENT_PENDING', 1100000);
    const verified = markPaymentVerified(s, '0xabc', 2000000);
    expect(verified.state).toBe('PAYMENT_VERIFIED');
    expect(verified.payment.verified).toBe(true);
    expect(verified.payment.txHash).toBe('0xabc');
    expect(verified.payment.verifiedAt).toBe(2000000);
    expect(verified.payment.consumedTxIds).toContain('0xabc');
    expect(verified.claimExpiresAt).toBe(2000000 + CLAIM_WINDOW_MS);
  });

  it('markPaymentVerified replay-protects consumed tx hashes', () => {
    const s = transition(baseSession(), 'PAYMENT_PENDING', 1100000);
    const v1 = markPaymentVerified(s, '0xabc', 2000000);
    expect(v1.payment.consumedTxIds).toEqual(['0xabc']);
    expect(v1.payment.consumedTxIds.length).toBe(1);
  });

  it('markCompleted sets used and claimedAt', () => {
    let s = transition(baseSession(), 'PAYMENT_PENDING', 1100000);
    const verified = markPaymentVerified(s, '0xabc', 1200000);
    s = transition(verified, 'AUTHORIZED', 1300000);
    s = transition(s, 'CLAIM_READY', 1400000);
    s = transition(s, 'CLAIMING', 1500000);
    const completed = markCompleted(s, 1600000);
    expect(completed.state).toBe('COMPLETED');
    expect(completed.used).toBe(true);
    expect(completed.claimedAt).toBe(1600000);
  });

  it('isExpired returns false for terminal states', () => {
    const s: TransferSession = { ...baseSession(), state: 'COMPLETED' };
    expect(isExpired(s, 9999999999)).toBe(false);
  });

  it('isExpired returns true when request TTL passes', () => {
    const s = baseSession();
    expect(isExpired(s, 1000000 + REQUEST_TTL_MS + 1)).toBe(true);
  });

  it('isExpired returns true when claim window passes after verification', () => {
    const s = transition(baseSession(), 'PAYMENT_PENDING', 1100000);
    const verified = markPaymentVerified(s, '0xabc', 2000000);
    expect(isExpired(verified, 2000000 + CLAIM_WINDOW_MS + 1)).toBe(true);
  });

  it('timeRemaining for pre-payment session', () => {
    const s = baseSession();
    const remaining = timeRemaining(s, 1000000 + 1800000);
    expect(remaining).toBe(REQUEST_TTL_MS - 1800000);
  });

  it('timeRemaining for post-verification session uses claimExpiresAt', () => {
    const s = transition(baseSession(), 'PAYMENT_PENDING', 1100000);
    const verified = markPaymentVerified(s, '0xabc', 2000000);
    const remaining = timeRemaining(verified, 2500000);
    expect(remaining).toBe(verified.claimExpiresAt! - 2500000);
  });

  it('full lifecycle: CREATED → PAYMENT_VERIFIED → AUTHORIZED → CLAIM_READY → CLAIMING → COMPLETED', () => {
    let s = baseSession();
    s = transition(s, 'PAYMENT_PENDING', 1100000);
    s = markPaymentVerified(s, '0xabc', 1200000);
    s = transition(s, 'AUTHORIZED', 1300000);
    s = transition(s, 'CLAIM_READY', 1400000);
    s = transition(s, 'CLAIMING', 1500000);
    s = markCompleted(s, 1600000);
    expect(s.state).toBe('COMPLETED');
    expect(s.used).toBe(true);
  });
});
