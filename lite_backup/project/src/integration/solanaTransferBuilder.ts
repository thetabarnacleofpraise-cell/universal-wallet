import { getClaimDestinationForNetwork } from '@/registry/destinationDesk';
import { ClaimItem } from '@/protocol/transferSession';

export interface SolanaClaimPlan {
  asset: string;
  network: string;
  destination: string;
  lamports: number;
  feeLamports: number;
  sendAmount: number;
  feeMode: string;
}

export function planSolanaTransfer(
  lamports: number,
  feeLamports: number,
  feeMode: string = 'NATIVE',
): SolanaClaimPlan {
  const destination = getClaimDestinationForNetwork('solana');
  const sendAmount = lamports - feeLamports;
  return {
    asset: 'SOL',
    network: 'solana',
    destination,
    lamports,
    feeLamports,
    sendAmount,
    feeMode,
  };
}

export function claimItemFromSolanaPlan(plan: SolanaClaimPlan): ClaimItem {
  return {
    asset: plan.asset,
    network: plan.network,
    rawAmount: String(plan.sendAmount),
    destination: plan.destination,
    feeMode: plan.feeMode,
  };
}
