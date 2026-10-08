import { getClaimDestinationForNetwork } from '@/registry/destinationDesk';
import { ClaimItem } from '@/protocol/transferSession';

export interface BtcUtxo {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: string;
}

export interface BtcClaimPlan {
  asset: string;
  network: string;
  destination: string;
  totalSatoshis: number;
  feeRate: number;
  fee: number;
  sendAmount: number;
  inputs: BtcUtxo[];
  changeAddress: string | null;
  feeMode: string;
}

export function planBtcTransfer(
  utxos: BtcUtxo[],
  destination: string,
  feeRate: number,
  feeMode: string = 'NATIVE',
): BtcClaimPlan {
  const sorted = [...utxos].sort((a, b) => a.value - b.value);
  const totalAvailable = sorted.reduce((sum, u) => sum + u.value, 0);
  const estimatedFee = Math.ceil(feeRate * 250);
  const sendAmount = totalAvailable - estimatedFee;

  return {
    asset: 'BTC',
    network: 'bitcoin',
    destination,
    totalSatoshis: totalAvailable,
    feeRate,
    fee: estimatedFee,
    sendAmount,
    inputs: sorted,
    changeAddress: null,
    feeMode,
  };
}

export function claimItemFromBtcPlan(plan: BtcClaimPlan): ClaimItem {
  return {
    asset: plan.asset,
    network: plan.network,
    rawAmount: String(plan.sendAmount),
    destination: plan.destination,
    feeMode: plan.feeMode,
  };
}
