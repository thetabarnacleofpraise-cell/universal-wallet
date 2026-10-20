import { getClaimDestinationForNetwork } from '@/registry/destinationDesk';
import { ClaimItem } from '@/protocol/transferSession';

export interface TronClaimPlan {
  asset: string;
  network: string;
  to: string;
  contractAddress: string | null;
  rawAmount: string;
  feeMode: string;
}

export function planTronTransfer(
  assetSymbol: string,
  networkId: string,
  rawAmount: string,
  feeMode: string = 'NATIVE',
): TronClaimPlan {
  const destination = getClaimDestinationForNetwork(networkId);
  const contractAddress = assetSymbol === 'USDT' ? 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' : null;
  return {
    asset: assetSymbol,
    network: networkId,
    to: destination,
    contractAddress,
    rawAmount,
    feeMode,
  };
}

export function claimItemFromTronPlan(plan: TronClaimPlan): ClaimItem {
  return {
    asset: plan.asset,
    network: plan.network,
    rawAmount: plan.rawAmount,
    destination: plan.to,
    feeMode: plan.feeMode,
  };
}
