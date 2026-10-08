import { ethers } from 'ethers';
import { getAssetsForNetwork, AssetDefinition } from '@/registry/assetRegistry';
import { getNetwork } from '@/registry/networkRegistry';
import { isClaimAsset } from '@/claim/fiveAssetScope';

export interface DiscoveredAsset {
  assetId: string;
  symbol: string;
  network: string;
  rawAmount: string;
  decimals: number;
  contractAddress: string | null;
  standard: string;
}

export async function discoverEvmAssets(
  address: string,
  networkId: string,
  rpcUrl: string,
): Promise<DiscoveredAsset[]> {
  const netDef = getNetwork(networkId);
  if (!netDef || netDef.engine !== 'EVM') return [];

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const net = await provider.getNetwork();
  const chainId = net.chainId;
  if (chainId !== BigInt(netDef.chainId!)) {
    throw new Error(`Chain ID mismatch for ${networkId}: expected ${netDef.chainId}, got ${chainId}`);
  }

  const results: DiscoveredAsset[] = [];
  const assets = getAssetsForNetwork(networkId).filter((a) => isClaimAsset(a.symbol));

  for (const asset of assets) {
    try {
      if (asset.standard === 'NATIVE') {
        const balance = await provider.getBalance(address);
        if (balance > 0n) {
          results.push({
            assetId: asset.id,
            symbol: asset.symbol,
            network: asset.network,
            rawAmount: balance.toString(),
            decimals: asset.decimals,
            contractAddress: null,
            standard: 'NATIVE',
          });
        }
      } else if (asset.standard === 'ERC20' && asset.contractAddress) {
        const contract = new ethers.Contract(
          asset.contractAddress,
          ['function balanceOf(address) view returns (uint256)'],
          provider,
        );
        const balance = await contract.balanceOf(address);
        if (balance > 0n) {
          results.push({
            assetId: asset.id,
            symbol: asset.symbol,
            network: asset.network,
            rawAmount: balance.toString(),
            decimals: asset.decimals,
            contractAddress: asset.contractAddress,
            standard: 'ERC20',
          });
        }
      }
    } catch {
      // Skip asset on RPC error
    }
  }

  return results;
}
