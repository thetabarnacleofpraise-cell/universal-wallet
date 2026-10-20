export type FeeMode = 'NATIVE' | 'TOKEN_PAYMASTER' | 'SPONSORED' | 'RELAYER';

export const ALL_FEE_MODES: FeeMode[] = ['NATIVE', 'TOKEN_PAYMASTER', 'SPONSORED', 'RELAYER'];

export function isFeeMode(value: string): value is FeeMode {
  return ALL_FEE_MODES.includes(value as FeeMode);
}
