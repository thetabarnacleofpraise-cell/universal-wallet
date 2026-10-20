export interface BtcDiscoveredAsset {
  assetId: string;
  symbol: string;
  network: string;
  rawAmount: string;
  decimals: number;
  contractAddress: string | null;
  standard: string;
}

export async function discoverBtcAssets(address: string, apiUrl: string): Promise<BtcDiscoveredAsset[]> {
  const results: BtcDiscoveredAsset[] = [];

  try {
    const res = await fetch(`${apiUrl}/balance?active=${address}`);
    if (!res.ok) return results;
    const data = await res.json();
    const confirmed = data?.[address]?.final_balance ?? 0;
    if (confirmed > 0) {
      results.push({
        assetId: 'btc-bitcoin',
        symbol: 'BTC',
        network: 'bitcoin',
        rawAmount: String(confirmed),
        decimals: 8,
        contractAddress: null,
        standard: 'BTC',
      });
    }
  } catch {
    // API error
  }

  return results;
}
