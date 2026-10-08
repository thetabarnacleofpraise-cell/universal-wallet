import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import { createManifest, computeManifestHash, canonicalizeManifest, verifyManifestHash, type ManifestData } from '@/claim/manifest';
import type { ClaimItem } from '@/protocol/transferSession';

describe('manifest', () => {
  const claims: ClaimItem[] = [
    { asset: 'ETH', network: 'ethereum', rawAmount: '1000000', destination: '0xabc', feeMode: 'NATIVE' },
    { asset: 'USDT', network: 'bsc', rawAmount: '500000', destination: '0xabc', feeMode: 'NATIVE' },
  ];

  it('canonicalizeManifest sorts claims by asset-network key', () => {
    const manifest: ManifestData = {
      sessionId: 'test-1',
      source: '0xabc',
      claims: [...claims].reverse(),
      expiresAt: 9999999,
    };
    const canonical = canonicalizeManifest(manifest);
    const parsed = JSON.parse(canonical);
    const keys = parsed.claims.map((c: any) => `${c.asset}-${c.network}`);
    expect(keys).toEqual([...keys].sort());
  });

  it('computeManifestHash returns a 0x-prefixed hash', () => {
    const { manifest, hash } = createManifest('test-1', '0xabc', claims, 9999999);
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('same manifest produces same hash', () => {
    const { hash: h1 } = createManifest('test-1', '0xabc', claims, 9999999);
    const { hash: h2 } = createManifest('test-1', '0xabc', claims, 9999999);
    expect(h1).toBe(h2);
  });

  it('different claims produce different hashes', () => {
    const { hash: h1 } = createManifest('test-1', '0xabc', claims, 9999999);
    const { hash: h2 } = createManifest('test-1', '0xabc', [...claims, {
      asset: 'BTC', network: 'bitcoin', rawAmount: '1000', destination: '1xyz', feeMode: 'NATIVE',
    }], 9999999);
    expect(h1).not.toBe(h2);
  });

  it('different order of same claims produces same hash (canonical)', () => {
    const { manifest: m1, hash: h1 } = createManifest('test-1', '0xabc', claims, 9999999);
    const { manifest: m2, hash: h2 } = createManifest('test-1', '0xabc', [...claims].reverse(), 9999999);
    expect(h1).toBe(h2);
  });

  it('verifyManifestHash returns true for matching hash', () => {
    const { manifest, hash } = createManifest('test-1', '0xabc', claims, 9999999);
    expect(verifyManifestHash(manifest, hash)).toBe(true);
  });

  it('verifyManifestHash returns false for wrong hash', () => {
    const { manifest } = createManifest('test-1', '0xabc', claims, 9999999);
    expect(verifyManifestHash(manifest, ethers.ZeroHash)).toBe(false);
  });
});
