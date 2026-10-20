import { describe, it, expect } from 'vitest';
import { createUniversalQrPayload, encodeQrPayload, decodeQrPayload } from '@/qr/universalQr';
import { HANDSHAKE_USD_CENTS, CLAIM_WINDOW_MS } from '@/protocol/transferSession';

describe('universalQr', () => {
  it('createUniversalQrPayload has correct handshake fields', () => {
    const payload = createUniversalQrPayload('session-1', '0x86ec4f0323beb13c6856c82830c348c24b24b5f1', 9999999);
    expect(payload.v).toBe(1);
    expect(payload.type).toBe('UNIVERSAL_TRANSFER');
    expect(payload.sid).toBe('session-1');
    expect(payload.handshake.network).toBe('bsc');
    expect(payload.handshake.chainId).toBe(56);
    expect(payload.handshake.asset).toBe('USDT');
    expect(payload.handshake.paymentAddress).toBe('0x86ec4f0323beb13c6856c82830c348c24b24b5f1');
    expect(payload.handshake.minimumUsdCents).toBe(HANDSHAKE_USD_CENTS);
    expect(payload.claimWindowMs).toBe(CLAIM_WINDOW_MS);
    expect(payload.nonce).toHaveLength(32);
  });

  it('encode/decode round-trip preserves payload', () => {
    const original = createUniversalQrPayload('session-2', '0xabc', 8888888);
    const encoded = encodeQrPayload(original);
    const decoded = decodeQrPayload(encoded);
    expect(decoded.sid).toBe(original.sid);
    expect(decoded.handshake.paymentAddress).toBe(original.handshake.paymentAddress);
    expect(decoded.handshake.chainId).toBe(original.handshake.chainId);
    expect(decoded.expiresAt).toBe(original.expiresAt);
  });

  it('decode rejects invalid payload version', () => {
    const bad = btoa(JSON.stringify({ v: 2, type: 'UNIVERSAL_TRANSFER' }));
    expect(() => decodeQrPayload(bad)).toThrow();
  });

  it('decode rejects invalid payload type', () => {
    const bad = btoa(JSON.stringify({ v: 1, type: 'WRONG' }));
    expect(() => decodeQrPayload(bad)).toThrow();
  });

  it('each createUniversalQrPayload call generates unique nonce', () => {
    const p1 = createUniversalQrPayload('s1', '0xabc', 1000);
    const p2 = createUniversalQrPayload('s1', '0xabc', 1000);
    expect(p1.nonce).not.toBe(p2.nonce);
  });
});
