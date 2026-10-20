import { ethers } from 'ethers';
import { ClaimItem } from '@/protocol/transferSession';

export interface ManifestData {
  sessionId: string;
  source: string;
  claims: ClaimItem[];
  expiresAt: number;
}

export function canonicalizeManifest(manifest: ManifestData): string {
  const sortedClaims = [...manifest.claims].sort((a, b) => {
    const aKey = `${a.asset}-${a.network}`;
    const bKey = `${b.asset}-${b.network}`;
    return aKey.localeCompare(bKey);
  });

  const canonical = {
    sessionId: manifest.sessionId,
    source: manifest.source,
    claims: sortedClaims.map((c) => ({
      asset: c.asset,
      network: c.network,
      rawAmount: c.rawAmount,
      destination: c.destination,
      feeMode: c.feeMode,
    })),
    expiresAt: manifest.expiresAt,
  };

  return JSON.stringify(canonical, Object.keys(canonical).sort());
}

export function computeManifestHash(manifest: ManifestData): string {
  const canonical = canonicalizeManifest(manifest);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

export function createManifest(
  sessionId: string,
  source: string,
  claims: ClaimItem[],
  expiresAt: number,
): { manifest: ManifestData; hash: string } {
  const manifest: ManifestData = { sessionId, source, claims, expiresAt };
  const hash = computeManifestHash(manifest);
  return { manifest, hash };
}

export function verifyManifestHash(manifest: ManifestData, expectedHash: string): boolean {
  return computeManifestHash(manifest) === expectedHash;
}
