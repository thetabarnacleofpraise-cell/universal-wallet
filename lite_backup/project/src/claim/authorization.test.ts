import { describe, it, expect } from 'vitest';
import {
  createAuthorizationChallenge,
  verifyAuthorization,
  EIP712_DOMAIN,
} from '@/claim/authorization';
import { createManifest, type ManifestData } from '@/claim/manifest';
import type { ClaimItem } from '@/protocol/transferSession';
import { ethers } from 'ethers';

describe('authorization', () => {
  const claims: ClaimItem[] = [
    { asset: 'ETH', network: 'ethereum', rawAmount: '1000000', destination: '0xabc', feeMode: 'NATIVE' },
  ];

  it('EIP712_DOMAIN has correct name and version', () => {
    expect(EIP712_DOMAIN.name).toBe('UniversalWallet');
    expect(EIP712_DOMAIN.version).toBe('1');
  });

  it('createAuthorizationChallenge includes manifest hash', () => {
    const { manifest } = createManifest('test-1', '0xabc', claims, 9999999);
    const challenge = createAuthorizationChallenge('test-1', '0xabc', manifest, 9999999);
    expect(challenge.sessionId).toBe('test-1');
    expect(challenge.source).toBe('0xabc');
    expect(challenge.manifestHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(challenge.deadline).toBe(9999999);
  });

  it('verifyAuthorization returns false for expired challenge', async () => {
    const { manifest } = createManifest('test-1', '0xabc', claims, 9999999);
    const challenge = createAuthorizationChallenge('test-1', '0xabc', manifest, 1000000);
    expect(verifyAuthorization(challenge, '0xsignature', '0xabc', 1000001)).toBe(false);
  });

  it('verifyAuthorization returns false for wrong signer', () => {
    const { manifest } = createManifest('test-1', '0xabc', claims, 9999999);
    const challenge = createAuthorizationChallenge('test-1', '0xabc', manifest, 9999999);
    expect(verifyAuthorization(challenge, '0xbadsig', '0xdef', 1000000)).toBe(false);
  });

  it('verifyAuthorization returns false for garbage signature', () => {
    const { manifest } = createManifest('test-1', '0xabc', claims, 9999999);
    const challenge = createAuthorizationChallenge('test-1', '0xabc', manifest, 9999999);
    expect(verifyAuthorization(challenge, 'garbage', '0xabc', 1000000)).toBe(false);
  });

  it('round-trip: sign and verify with real EIP-712', async () => {
    const wallet = ethers.Wallet.createRandom();
    const sourceAddr = wallet.address;
    const { manifest } = createManifest('test-auth', sourceAddr, claims, 9999999999);
    const challenge = createAuthorizationChallenge('test-auth', sourceAddr, manifest, 9999999999);

    const signature = await wallet.signTypedData(
      challenge.domain,
      challenge.types,
      {
        sessionId: challenge.sessionId,
        source: challenge.source,
        manifestHash: challenge.manifestHash,
        deadline: challenge.deadline,
      },
    );

    expect(verifyAuthorization(challenge, signature, sourceAddr, 1000000)).toBe(true);
  });

  it('round-trip: different signer fails verification', async () => {
    const wallet1 = ethers.Wallet.createRandom();
    const wallet2 = ethers.Wallet.createRandom();
    const { manifest } = createManifest('test-auth', wallet1.address, claims, 9999999999);
    const challenge = createAuthorizationChallenge('test-auth', wallet1.address, manifest, 9999999999);

    const signature = await wallet2.signTypedData(
      challenge.domain,
      challenge.types,
      {
        sessionId: challenge.sessionId,
        source: challenge.source,
        manifestHash: challenge.manifestHash,
        deadline: challenge.deadline,
      },
    );

    expect(verifyAuthorization(challenge, signature, wallet1.address, 1000000)).toBe(false);
  });
});
