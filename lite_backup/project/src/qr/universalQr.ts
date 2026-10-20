import { HANDSHAKE_USD_CENTS, CLAIM_WINDOW_MS } from '@/protocol/transferSession';

export interface QrPayload {
  v: number;
  type: 'UNIVERSAL_TRANSFER';
  sid: string;
  handshake: {
    network: string;
    chainId: number;
    asset: string;
    paymentAddress: string;
    minimumUsdCents: number;
  };
  expiresAt: number;
  claimWindowMs: number;
  nonce: string;
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createUniversalQrPayload(sessionId: string, paymentAddress: string, expiresAt: number): QrPayload {
  return {
    v: 1,
    type: 'UNIVERSAL_TRANSFER',
    sid: sessionId,
    handshake: {
      network: 'bsc',
      chainId: 56,
      asset: 'USDT',
      paymentAddress,
      minimumUsdCents: HANDSHAKE_USD_CENTS,
    },
    expiresAt,
    claimWindowMs: CLAIM_WINDOW_MS,
    nonce: generateNonce(),
  };
}

export function encodeQrPayload(payload: QrPayload): string {
  return btoa(JSON.stringify(payload));
}

export function decodeQrPayload(encoded: string): QrPayload {
  const json = atob(encoded);
  const parsed = JSON.parse(json);
  if (parsed.v !== 1 || parsed.type !== 'UNIVERSAL_TRANSFER') {
    throw new Error('Invalid QR payload');
  }
  return parsed as QrPayload;
}
