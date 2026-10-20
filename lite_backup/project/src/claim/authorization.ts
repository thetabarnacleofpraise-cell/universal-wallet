import { ethers } from 'ethers';
import { computeManifestHash, ManifestData } from '@/claim/manifest';

export const EIP712_DOMAIN = {
  name: 'UniversalWallet',
  version: '1',
  chainId: 1,
} as const;

export const CLAIM_AUTHORIZATION_TYPE = [
  { name: 'sessionId', type: 'string' },
  { name: 'source', type: 'address' },
  { name: 'manifestHash', type: 'bytes32' },
  { name: 'deadline', type: 'uint256' },
];

export interface AuthorizationChallenge {
  sessionId: string;
  source: string;
  manifestHash: string;
  deadline: number;
  domain: typeof EIP712_DOMAIN;
  types: { ClaimAuthorization: typeof CLAIM_AUTHORIZATION_TYPE };
}

export function createAuthorizationChallenge(
  sessionId: string,
  source: string,
  manifest: ManifestData,
  deadline: number,
): AuthorizationChallenge {
  const manifestHash = computeManifestHash(manifest);
  return {
    sessionId,
    source,
    manifestHash,
    deadline,
    domain: EIP712_DOMAIN,
    types: { ClaimAuthorization: CLAIM_AUTHORIZATION_TYPE },
  };
}

export function verifyAuthorization(
  challenge: AuthorizationChallenge,
  signature: string,
  expectedSigner: string,
  now: number,
): boolean {
  if (now > challenge.deadline) return false;
  if (challenge.source.toLowerCase() !== expectedSigner.toLowerCase()) return false;

  try {
    const recovered = ethers.verifyTypedData(
      challenge.domain,
      challenge.types,
      {
        sessionId: challenge.sessionId,
        source: challenge.source,
        manifestHash: challenge.manifestHash,
        deadline: challenge.deadline,
      },
      signature,
    );
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  } catch {
    return false;
  }
}
