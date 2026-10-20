export interface SolanaDiscoveredAsset {
  assetId: string;
  symbol: string;
  network: string;
  rawAmount: string;
  decimals: number;
  contractAddress: string | null;
  standard: string;
}

export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded, 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

export async function discoverSolanaAssets(
  address: string,
  rpcUrl: string,
): Promise<SolanaDiscoveredAsset[]> {
  if (!isValidSolanaAddress(address)) return [];

  const results: SolanaDiscoveredAsset[] = [];

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      }),
    });
    if (!res.ok) return results;
    const data = await res.json();
    const lamports = data?.result?.value ?? 0;
    if (lamports > 0) {
      results.push({
        assetId: 'sol-solana',
        symbol: 'SOL',
        network: 'solana',
        rawAmount: String(lamports),
        decimals: 9,
        contractAddress: null,
        standard: 'NATIVE',
      });
    }
  } catch {
    // RPC error
  }

  return results;
}
