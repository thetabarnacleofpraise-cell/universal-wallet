export interface TronDiscoveredAsset {
  assetId: string;
  symbol: string;
  network: string;
  rawAmount: string;
  decimals: number;
  contractAddress: string | null;
  standard: string;
}

export async function discoverTronAssets(
  address: string,
  rpcUrl: string,
): Promise<TronDiscoveredAsset[]> {
  // TRON discovery: TRX native + USDT TRC20
  // TRX is NOT part of the Universal six-asset claim scope, only USDT is.
  const results: TronDiscoveredAsset[] = [];

  try {
    const balanceRes = await fetch(`${rpcUrl}/v1/accounts/${address}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!balanceRes.ok) return results;
    const data = await balanceRes.json();
    const trxBalance = data?.data?.[0]?.balance ?? 0;
    // TRX is discovered but NOT added to claim results (filtered by six-asset scope)
    // Only USDT TRC20 is relevant for Universal claims

    const trc20Balance = data?.data?.[0]?.trc20?.['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'] ?? 0;
    if (trc20Balance > 0) {
      results.push({
        assetId: 'usdt-tron',
        symbol: 'USDT',
        network: 'tron',
        rawAmount: String(trc20Balance),
        decimals: 6,
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        standard: 'TRC20',
      });
    }

    void trxBalance; // TRX intentionally excluded from claim scope
  } catch {
    // RPC error
  }

  return results;
}
