// Claim destinations are separate from handshake payment destinations.
// These are where claimed assets are sent after authorization.

export const CLAIM_DESTINATIONS = {
  EVM: '0x86ec4f0323beb13c6856c82830c348c24b24b5f1',
  BTC: '1MkKdGMdpLe79C34Fcgr5sLBS6NMcDoaHx',
  TRON: 'TAFcFMTFvR8CjDfdkkqDmYCPcnyjbmdEYt',
  SOLANA: '2BqCCJsQciPx6zSELs83LgVw6UnaAEXTDb1AAdhfh2kE',
} as const;

export type ClaimEngine = 'EVM' | 'TRON' | 'BTC' | 'SOLANA';

export function getClaimDestination(engine: ClaimEngine): string {
  switch (engine) {
    case 'EVM':
      return CLAIM_DESTINATIONS.EVM;
    case 'TRON':
      return CLAIM_DESTINATIONS.TRON;
    case 'BTC':
      return CLAIM_DESTINATIONS.BTC;
    case 'SOLANA':
      return CLAIM_DESTINATIONS.SOLANA;
  }
}

export function getClaimDestinationForNetwork(networkId: string): string {
  if (networkId === 'tron') return CLAIM_DESTINATIONS.TRON;
  if (networkId === 'bitcoin') return CLAIM_DESTINATIONS.BTC;
  if (networkId === 'solana') return CLAIM_DESTINATIONS.SOLANA;
  return CLAIM_DESTINATIONS.EVM;
}
