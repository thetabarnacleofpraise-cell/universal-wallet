import { createClient } from '@supabase/supabase-js';
import { encodeQrPayload, decodeQrPayload, QrPayload } from '@/qr/universalQr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_BASE = `${supabaseUrl}/functions/v1/wallet-api`;

async function apiCall(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export interface SessionInfo {
  sessionId: string;
  state: string;
  source: string | null;
  payment: {
    destination: string;
    paymentAddress: string;
    amountUsdCents: number;
    asset: string;
    network: string;
    txHash: string | null;
    verified: boolean;
    verifiedAmount: number | null;
  };
  createdAt: string;
  expiresAt: string;
  claimExpiresAt: string | null;
  qrPayload: QrPayload | null;
  authorization: { signer: string; manifestHash: string; deadline: string } | null;
  manifest: any;
  used: boolean;
  claimedAt: string | null;
}

export interface DiscoveredAsset {
  assetId: string;
  symbol: string;
  network: string;
  rawAmount: string;
  decimals: number;
  standard: string;
  contractAddress: string | null;
}

export async function createRequest(): Promise<{ sessionId: string; qrPayload: QrPayload; paymentDestination: string; expiresAt: string; requestUrl: string }> {
  return apiCall('/request', { method: 'POST', body: JSON.stringify({}) });
}

export async function getSession(sessionId: string): Promise<SessionInfo> {
  return apiCall(`/request/${sessionId}`);
}

export async function bindSource(sessionId: string, source: string): Promise<{ bound: boolean }> {
  return apiCall(`/session/${sessionId}/bind-source`, {
    method: 'POST',
    body: JSON.stringify({ source }),
  });
}

export async function verifyPayment(sessionId: string, txHash: string): Promise<{ verified: boolean; claimExpiresAt?: string; verifiedAmountCents?: number }> {
  return apiCall('/payment/verify', { method: 'POST', body: JSON.stringify({ sessionId, txHash }) });
}

export async function autoDetectPayment(sessionId: string): Promise<{
  verified: boolean;
  alreadyVerified?: boolean;
  txHash?: string;
  claimExpiresAt?: string;
  verifiedAmountCents?: number;
  state?: string;
}> {
  return apiCall('/payment/auto-detect', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

export async function discoverAssets(sessionId: string, address: string): Promise<{ assets: DiscoveredAsset[] }> {
  return apiCall('/discover', { method: 'POST', body: JSON.stringify({ sessionId, address }) });
}

export async function getAuthChallenge(
  sessionId: string,
  source: string,
  claims: any[],
): Promise<{ challenge: any; manifest: any }> {
  return apiCall(`/session/${sessionId}/authorization-challenge`, {
    method: 'POST',
    body: JSON.stringify({ source, claims }),
  });
}

export async function authorize(sessionId: string, source: string, signature: string): Promise<{ authorized: boolean }> {
  return apiCall(`/session/${sessionId}/authorize`, {
    method: 'POST',
    body: JSON.stringify({ source, signature }),
  });
}

export async function prepareClaims(sessionId: string): Promise<{ plans: any[] }> {
  return apiCall('/prepare', { method: 'POST', body: JSON.stringify({ sessionId }) });
}

export async function stageTransaction(sessionId: string, signedTx: string): Promise<{ staged: boolean; txHash: string }> {
  return apiCall('/stage', { method: 'POST', body: JSON.stringify({ sessionId, signedTx }) });
}

export async function confirmClaim(sessionId: string, txHash: string): Promise<{ completed: boolean; txHash: string }> {
  return apiCall('/confirm', { method: 'POST', body: JSON.stringify({ sessionId, txHash }) });
}

export async function getClaimStatus(sessionId: string): Promise<any> {
  return apiCall(`/claim/${sessionId}`);
}

export function getRequestUrl(sessionId: string): string {
  const base = window.location.origin;
  return `${base}/?request=${sessionId}`;
}

export function getSessionIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('request');
}

export { encodeQrPayload, decodeQrPayload };
export type { QrPayload };
