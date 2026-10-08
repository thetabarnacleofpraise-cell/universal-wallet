import { ethers } from 'ethers';
import { AssetDefinition } from '@/registry/assetRegistry';
import { getClaimDestinationForNetwork } from '@/registry/destinationDesk';
import { ClaimItem } from '@/protocol/transferSession';

export interface EvmClaimPlan {
  asset: string;
  network: string;
  to: string;
  value: bigint;
  contractAddress: string | null;
  data: string | null;
  feeMode: string;
}

export function planEvmTransfer(
  asset: AssetDefinition,
  rawAmount: string,
  sourceAddress: string,
  feeMode: string = 'NATIVE',
): EvmClaimPlan {
  const destination = getClaimDestinationForNetwork(asset.network);

  if (asset.standard === 'NATIVE') {
    return {
      asset: asset.symbol,
      network: asset.network,
      to: destination,
      value: BigInt(rawAmount),
      contractAddress: null,
      data: '0x',
      feeMode,
    };
  }

  if (asset.standard === 'ERC20' && asset.contractAddress) {
    const erc20Interface = new ethers.Interface(['function transfer(address to, uint256 value)']);
    const data = erc20Interface.encodeFunctionData('transfer', [destination, BigInt(rawAmount)]);
    return {
      asset: asset.symbol,
      network: asset.network,
      to: asset.contractAddress,
      value: 0n,
      contractAddress: asset.contractAddress,
      data,
      feeMode,
    };
  }

  throw new Error(`Unsupported asset standard: ${asset.standard}`);
}

export function buildEvmTransaction(
  plan: EvmClaimPlan,
  nonce: number,
  chainId: number,
  gasLimit: bigint,
  maxFeePerGas: bigint,
  maxPriorityFeePerGas: bigint,
): ethers.TransactionRequest {
  return {
    to: plan.to,
    value: plan.value,
    data: plan.data ?? undefined,
    nonce,
    chainId,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    type: 2,
  from: undefined,
  };
}

export function verifyEvmTransaction(
  tx: ethers.TransactionRequest,
  plan: EvmClaimPlan,
  expectedChainId: number,
): boolean {
  if (tx.chainId !== expectedChainId) return false;
  const txTo = tx.to;
  if (typeof txTo === 'string' && txTo.toLowerCase() !== plan.to.toLowerCase()) return false;
  if (plan.data && tx.data !== plan.data) return false;
  if (plan.value && tx.value !== plan.value) return false;
  return true;
}

export function claimItemFromPlan(plan: EvmClaimPlan): ClaimItem {
  return {
    asset: plan.asset,
    network: plan.network,
    rawAmount: plan.value.toString(),
    destination: plan.to,
    feeMode: plan.feeMode,
  };
}
