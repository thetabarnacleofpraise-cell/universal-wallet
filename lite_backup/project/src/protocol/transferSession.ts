export type SessionState =
  | 'CREATED'
  | 'SCANNED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_VERIFIED'
  | 'AUTHORIZED'
  | 'CLAIM_READY'
  | 'CLAIMING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'FAILED';

export interface SessionPayment {
  destination: string;
  amountUsdCents: number;
  asset: string;
  network: string;
  txHash: string | null;
  verified: boolean;
  verifiedAt: number | null;
  consumedTxIds: string[];
}

export interface SessionAuthorization {
  signer: string;
  signature: string;
  manifestHash: string;
  deadline: number;
  verified: boolean;
  authorizedAt: number | null;
}

export interface ClaimItem {
  asset: string;
  network: string;
  rawAmount: string;
  destination: string;
  feeMode: string;
}

export interface SessionManifest {
  sessionId: string;
  source: string;
  claims: ClaimItem[];
  expiresAt: number;
  hash: string;
}

export interface TransferSession {
  id: string;
  source: string | null;
  payment: SessionPayment;
  createdAt: number;
  expiresAt: number;
  claimExpiresAt: number | null;
  state: SessionState;
  authorization: SessionAuthorization | null;
  manifest: SessionManifest | null;
  used: boolean;
  claimedAt: number | null;
  capabilities: string[];
}

export const REQUEST_TTL_MS = 3600000; // 1 hour
export const CLAIM_WINDOW_MS = 21600000; // 6 hours
export const HANDSHAKE_USD_CENTS = 200; // $2.00

const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  CREATED: ['SCANNED', 'PAYMENT_PENDING', 'EXPIRED', 'FAILED'],
  SCANNED: ['PAYMENT_PENDING', 'EXPIRED', 'FAILED'],
  PAYMENT_PENDING: ['PAYMENT_VERIFIED', 'EXPIRED', 'FAILED'],
  PAYMENT_VERIFIED: ['AUTHORIZED', 'EXPIRED', 'FAILED'],
  AUTHORIZED: ['CLAIM_READY', 'EXPIRED', 'FAILED'],
  CLAIM_READY: ['CLAIMING', 'EXPIRED', 'FAILED'],
  CLAIMING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  EXPIRED: [],
  FAILED: [],
};

const TERMINAL_STATES: SessionState[] = ['COMPLETED', 'EXPIRED', 'FAILED'];

export function canTransition(from: SessionState, to: SessionState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function isTerminal(state: SessionState): boolean {
  return TERMINAL_STATES.includes(state);
}

export function isExpired(session: TransferSession, now: number): boolean {
  if (isTerminal(session.state)) return false;

  if (session.claimExpiresAt) {
    return now > session.claimExpiresAt;
  }

  return now > session.expiresAt;
}

export function createSession(params: {
  id: string;
  paymentDestination: string;
  amountUsdCents: number;
  paymentAsset: string;
  paymentNetwork: string;
  createdAt?: number;
}): TransferSession {
  const createdAt = params.createdAt ?? Date.now();
  return {
    id: params.id,
    source: null,
    payment: {
      destination: params.paymentDestination,
      amountUsdCents: params.amountUsdCents,
      asset: params.paymentAsset,
      network: params.paymentNetwork,
      txHash: null,
      verified: false,
      verifiedAt: null,
      consumedTxIds: [],
    },
    createdAt,
    expiresAt: createdAt + REQUEST_TTL_MS,
    claimExpiresAt: null,
    state: 'CREATED',
    authorization: null,
    manifest: null,
    used: false,
    claimedAt: null,
    capabilities: [],
  };
}

export function transition(session: TransferSession, to: SessionState, now: number): TransferSession {
  if (isTerminal(session.state)) {
    throw new Error(`Session ${session.id} is in terminal state ${session.state}`);
  }
  if (!canTransition(session.state, to)) {
    throw new Error(`Invalid transition from ${session.state} to ${to}`);
  }
  return { ...session, state: to };
}

export function markPaymentVerified(session: TransferSession, txHash: string, verifiedAt: number): TransferSession {
  const updated = transition(session, 'PAYMENT_VERIFIED', verifiedAt);
  return {
    ...updated,
    payment: {
      ...updated.payment,
      txHash,
      verified: true,
      verifiedAt,
      consumedTxIds: [...updated.payment.consumedTxIds, txHash],
    },
    claimExpiresAt: verifiedAt + CLAIM_WINDOW_MS,
  };
}

export function markCompleted(session: TransferSession, completedAt: number): TransferSession {
  const updated = transition(session, 'COMPLETED', completedAt);
  return {
    ...updated,
    used: true,
    claimedAt: completedAt,
  };
}

export function markExpired(session: TransferSession, now: number): TransferSession {
  if (isTerminal(session.state)) return session;
  return { ...session, state: 'EXPIRED' };
}

export function markFailed(session: TransferSession, now: number): TransferSession {
  if (isTerminal(session.state)) return session;
  return { ...session, state: 'FAILED' };
}

export function timeRemaining(session: TransferSession, now: number): number {
  if (session.state === 'PAYMENT_VERIFIED' || session.state === 'AUTHORIZED' || session.state === 'CLAIM_READY' || session.state === 'CLAIMING') {
    return session.claimExpiresAt ? Math.max(0, session.claimExpiresAt - now) : 0;
  }
  return Math.max(0, session.expiresAt - now);
}
