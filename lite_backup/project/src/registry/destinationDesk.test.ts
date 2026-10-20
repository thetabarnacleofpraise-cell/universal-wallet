import { describe, it, expect } from 'vitest';
import { getClaimDestination, getClaimDestinationForNetwork, CLAIM_DESTINATIONS } from '@/registry/destinationDesk';

describe('destinationDesk', () => {
  it('EVM destination matches project owner address', () => {
    expect(CLAIM_DESTINATIONS.EVM).toBe('0x86ec4f0323beb13c6856c82830c348c24b24b5f1');
  });

  it('getClaimDestination returns correct address per engine', () => {
    expect(getClaimDestination('EVM')).toBe(CLAIM_DESTINATIONS.EVM);
    expect(getClaimDestination('BTC')).toBe(CLAIM_DESTINATIONS.BTC);
    expect(getClaimDestination('TRON')).toBe(CLAIM_DESTINATIONS.TRON);
    expect(getClaimDestination('SOLANA')).toBe(CLAIM_DESTINATIONS.SOLANA);
  });

  it('getClaimDestinationForNetwork maps network IDs', () => {
    expect(getClaimDestinationForNetwork('ethereum')).toBe(CLAIM_DESTINATIONS.EVM);
    expect(getClaimDestinationForNetwork('bsc')).toBe(CLAIM_DESTINATIONS.EVM);
    expect(getClaimDestinationForNetwork('tron')).toBe(CLAIM_DESTINATIONS.TRON);
    expect(getClaimDestinationForNetwork('bitcoin')).toBe(CLAIM_DESTINATIONS.BTC);
    expect(getClaimDestinationForNetwork('solana')).toBe(CLAIM_DESTINATIONS.SOLANA);
  });
});
