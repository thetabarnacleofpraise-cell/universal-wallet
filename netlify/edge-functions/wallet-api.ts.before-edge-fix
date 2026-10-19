import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const REQUEST_TTL_MS = 21600000;
const CLAIM_WINDOW_MS = 21600000;
const HANDSHAKE_USD_CENTS = 200;

const CLAIM_DESTINATIONS = {
  EVM: "0x86ec4f0323beb13c6856c82830c348c24b24b5f1",
  BTC: "1MkKdGMdpLe79C34Fcgr5sLBS6NMcDoaHx",
  TRON: "TAFcFMTFvR8CjDfdkkqDmYCPcnyjbmdEYt",
  TON:  "UQBL1wCYS7oUtghfJePmLp6Fg7Jo9go3Ou__m1mkNiVWt-Xb",
  SOLANA: "2BqCCJsQciPx6zSELs83LgVw6UnaAEXTDb1AAdhfh2kE",
};

// Handshake payment destination is SEPARATE from claim destinations.
// This is a public receiving address for BSC USDT handshake payments only.
const HANDSHAKE_PAYMENT_ADDRESS_BSC =
  Deno.env.get("HANDSHAKE_PAYMENT_ADDRESS_BSC") ??
  "0x86ec4f0323beb13c6856c82830c348c24b24b5f1";

// BSC USDT (BEP-20) contract address (mainnet, chain ID 56)
const BSC_USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
const BSC_CHAIN_ID = 56;
// BSC USDT uses 18 decimals (unlike Ethereum USDT's 6)
// Minimum: 2 USDT = 2_000000000000000000 raw units (18 decimals)
const MIN_USDT_RAW = 2_000000000000000000n;

const CLAIM_ASSET_SYMBOLS = ["ETH", "USDT", "USDC", "BNB", "BTC", "SOL"];

const EVM_RPC_URLS: Record<string, string> = {
  ethereum: Deno.env.get("ETHEREUM_RPC_URL") ?? "https://eth.llamarpc.com",
  base: Deno.env.get("BASE_RPC_URL") ?? "https://mainnet.base.org",
  arbitrum: Deno.env.get("ARBITRUM_RPC_URL") ?? "https://arb1.arbitrum.io/rpc",
  optimism: Deno.env.get("OPTIMISM_RPC_URL") ?? "https://mainnet.optimism.io",
  polygon: Deno.env.get("POLYGON_RPC_URL") ?? "https://polygon-rpc.com",
  bsc: Deno.env.get("BSC_RPC_URL") ?? "https://bsc-dataseed.binance.org",
  avalanche: Deno.env.get("AVALANCHE_RPC_URL") ?? "https://api.avax.network/ext/bc/C/rpc",
};

const TRON_RPC_URL = Deno.env.get("TRON_RPC_URL") ?? "https://api.trongrid.io";

const BTC_API_URL = "https://blockchain.info";

const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

const ASSET_CONTRACTS: Record<string, Record<string, string>> = {
  ethereum: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    ETH: "NATIVE",
  },
  bsc: {
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    BNB: "NATIVE",
  },
  optimism: {
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    ETH: "NATIVE",
  },
  avalanche: {
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  },
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    ETH: "NATIVE",
  },
  arbitrum: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    ETH: "NATIVE",
  },
  polygon: {
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  },
};

function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, key);
}

function jsonBody(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorBody(message: string, status = 400) {
  return jsonBody({ error: message }, status);
}

async function handleCreateRequest(supabase: ReturnType<typeof getSupabase>) {
  const sessionId = generateSessionId();
  const nonce = generateNonce();
  const now = Date.now();
  const expiresAt = new Date(now + REQUEST_TTL_MS).toISOString();

  const qrPayload = {
    v: 1,
    type: "UNIVERSAL_TRANSFER",
    sid: sessionId,
    handshake: {
      network: "bsc",
      chainId: BSC_CHAIN_ID,
      asset: "USDT",
      paymentAddress: HANDSHAKE_PAYMENT_ADDRESS_BSC,
      minimumUsdCents: HANDSHAKE_USD_CENTS,
    },
    expiresAt,
    claimWindowMs: CLAIM_WINDOW_MS,
    nonce,
  };

  const { error } = await supabase.from("transfer_sessions").insert({
    id: sessionId,
    payment_destination: HANDSHAKE_PAYMENT_ADDRESS_BSC,
    amount_usd_cents: HANDSHAKE_USD_CENTS,
    payment_asset: "USDT",
    payment_network: "bsc",
    state: "CREATED",
    expires_at: expiresAt,
    qr_payload: qrPayload,
    nonce,
  });

  if (error) return errorBody("Failed to create session", 500);

  const requestUrl = `https://universalwallet.name.ng/?request=${sessionId}`;

  return jsonBody({ sessionId, qrPayload, paymentDestination: HANDSHAKE_PAYMENT_ADDRESS_BSC, expiresAt, requestUrl });
}

async function handleGetRequest(supabase: ReturnType<typeof getSupabase>, sessionId: string) {
  const { data, error } = await supabase
    .from("transfer_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) return errorBody("Session not found", 404);

  return jsonBody({
    sessionId: data.id,
    state: data.state,
    source: data.source,
    payment: {
      destination: data.payment_destination,
      paymentAddress: data.payment_destination,
      amountUsdCents: data.amount_usd_cents,
      asset: data.payment_asset,
      network: data.payment_network,
      txHash: data.payment_tx_hash,
      verified: data.payment_verified,
      verifiedAmount: data.payment_verified_amount ?? null,
    },
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    claimExpiresAt: data.claim_expires_at,
    qrPayload: data.qr_payload,
    authorization: data.authorization_verified ? {
      signer: data.authorization_signer,
      manifestHash: data.authorization_manifest_hash,
      deadline: data.authorization_deadline,
    } : null,
    manifest: data.manifest,
    used: data.used,
    claimedAt: data.claimed_at,
  });
}

async function handleBindSource(supabase: ReturnType<typeof getSupabase>, sessionId: string, body: any) {
  const { data: session } = await supabase
    .from("transfer_sessions")
    .select("state, source")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return errorBody("Session not found", 404);
  if (
    session.state !== "CREATED" &&
    session.state !== "SCANNED" &&
    session.state !== "PAYMENT_PENDING" &&
    session.state !== "PAYMENT_VERIFIED" &&
    session.state !== "AUTHORIZED"
  ) {
    return errorBody("Session not available for source binding", 400);
  }

  const source = body?.source;
  if (!source) return errorBody("source required", 400);

  // If source already bound, it must match
  if (session.source && session.source.toLowerCase() !== source.toLowerCase()) {
    return errorBody("Source wallet mismatch - session already bound to different address", 401);
  }

  await supabase.from("transfer_sessions").update({ source }).eq("id", sessionId);
  return jsonBody({ bound: true });
}

async function handleVerifyPayment(supabase: ReturnType<typeof getSupabase>, body: any) {
  const sessionId = body?.sessionId;
  if (!sessionId) return errorBody("sessionId required", 400);

  const { data: session, error } = await supabase
    .from("transfer_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) return errorBody("Session not found", 404);

  if (session.payment_verified) {
    return jsonBody({ verified: true, alreadyVerified: true });
  }

  if (session.state === "EXPIRED" || session.state === "FAILED") {
    return errorBody("Session is no longer active", 400);
  }

  const now = Date.now();
  if (new Date(session.expires_at).getTime() < now) {
    await supabase.from("transfer_sessions").update({ state: "EXPIRED" }).eq("id", sessionId);
    return errorBody("Request has expired", 400);
  }

  const txHash = body?.txHash;
  if (!txHash) return errorBody("txHash required", 400);

  // The handshake is always BSC USDT — server determines the network, not the browser.
  const paymentNetwork = "bsc";

  // Check idempotency - has this tx been consumed by another session?
  const { data: consumed } = await supabase
    .from("consumed_payments")
    .select("id, session_id")
    .eq("tx_hash", txHash)
    .eq("network", paymentNetwork)
    .maybeSingle();

  if (consumed && consumed.session_id !== sessionId) {
    return errorBody("Payment transaction already consumed by another session", 409);
  }

// Verify the actual BSC USDT blockchain transaction
  let verified = false;
  let verifiedAmountCents = 0;
  try {
    const result = await verifyBscUsdtPayment(txHash, session.payment_destination, session.source, new Date(session.created_at).getTime());
    verified = result.verified;
    verifiedAmountCents = result.amountCents;
  } catch (err) {
    return errorBody(`Payment verification failed: ${err.message}`, 400);
  }

  if (!verified) {
    return jsonBody({ verified: false });
  }

  // Mark payment as consumed
  await supabase.from("consumed_payments").insert({
    tx_hash: txHash,
    network: paymentNetwork,
    session_id: sessionId,
  });

  const claimExpiresAt = new Date(Date.now() + CLAIM_WINDOW_MS).toISOString();

  await supabase.from("transfer_sessions").update({
    state: session.authorization_verified ? "AUTHORIZED" : "PAYMENT_VERIFIED",
    payment_verified: true,
    payment_verified_at: new Date().toISOString(),
    payment_tx_hash: txHash,
    payment_verified_amount: verifiedAmountCents,
    claim_expires_at: claimExpiresAt,
  }).eq("id", sessionId);

  return jsonBody({ verified: true, claimExpiresAt, verifiedAmountCents });
}

async function verifyBscUsdtPayment(
  txHash: string,
  expectedDestination: string,
  expectedSource: string | null,
  createdAt: Date,
): Promise<{ verified: boolean; amountCents: number }> {
  const rpcUrl = EVM_RPC_URLS.bsc;
  if (!rpcUrl) return { verified: false, amountCents: 0 };

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Verify chain ID is BSC (56)
  const net = await provider.getNetwork();
  if (net.chainId !== BSC_CHAIN_ID) return { verified: false, amountCents: 0 };

  const tx = await provider.getTransaction(txHash);
  if (!tx) return { verified: false, amountCents: 0 };

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) return { verified: false, amountCents: 0 };

  // Transaction must be mined after session creation
  if (tx.blockNumber) {
    const block = await provider.getBlock(tx.blockNumber);
    if (block && block.timestamp * 1000 < createdAt.getTime()) return { verified: false, amountCents: 0 };
  }

  // If source wallet is bound, verify the transaction sender matches
  if (expectedSource && tx.from?.toLowerCase() !== expectedSource.toLowerCase()) {
    return { verified: false, amountCents: 0 };
  }

  // Look for USDT Transfer event to the handshake destination from the exact BSC USDT contract
  const transferTopic = ethers.id("Transfer(address,address,uint256)");
  const destTopic = ethers.zeroPadValue(expectedDestination, 32);

  let matchingTransfers = 0;
  let verifiedAmount = 0n;

  for (const log of receipt.logs) {
    // Must be from the exact BSC USDT contract
    if (log.address.toLowerCase() !== BSC_USDT_CONTRACT.toLowerCase()) continue;
    if (log.topics[0] !== transferTopic) continue;
    if (log.topics[2]?.toLowerCase() !== destTopic.toLowerCase()) continue;

    const amount = BigInt(log.data);
    matchingTransfers++;

    // Minimum: 2 USDT = 2e18 raw (18 decimals)
    if (amount >= MIN_USDT_RAW) {
      verifiedAmount = amount;
    }
  }

  // Reject if multiple ambiguous transfers found
  if (matchingTransfers > 1) return { verified: false, amountCents: 0 };
  if (verifiedAmount === 0n) return { verified: false, amountCents: 0 };

  // Convert raw USDT (18 decimals) to cents: 1 USDT = 100 cents, 1 USDT = 1e18 raw
  const amountCents = Number(verifiedAmount / 10_000_000_000_000_000n);
  return { verified: true, amountCents };
}


async function handleAutoDetectPayment(
  supabase: ReturnType<typeof getSupabase>,
  sessionId: string,
) {
  const { data: session, error } = await supabase
    .from("transfer_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) {
    return errorBody("Session not found", 404);
  }

  if (session.payment_verified) {
    return jsonBody({
      verified: true,
      alreadyVerified: true,
      txHash: session.payment_tx_hash,
      verifiedAmountCents: session.payment_verified_amount,
      claimExpiresAt: session.claim_expires_at,
    });
  }

  if (session.state === "EXPIRED" || session.state === "FAILED" || session.state === "COMPLETED") {
    return jsonBody({ verified: false, state: session.state });
  }

  const now = Date.now();

  if (new Date(session.expires_at).getTime() < now) {
    await supabase
      .from("transfer_sessions")
      .update({ state: "EXPIRED" })
      .eq("id", sessionId);

    return jsonBody({ verified: false, state: "EXPIRED" });
  }

  const rpcUrl = EVM_RPC_URLS.bsc;
  if (!rpcUrl) {
    return errorBody("BSC RPC is not configured", 500);
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const latestBlock = await provider.getBlockNumber();

    // BSC is fast (~0.5s blocks). Search roughly the current
    // one-hour request lifetime plus a safety margin.
    const fromBlock = Math.max(0, latestBlock - 12000);

    const transferTopic = ethers.id("Transfer(address,address,uint256)");
    const destinationTopic = ethers.zeroPadValue(
      session.payment_destination,
      32,
    );

    const logs = await provider.getLogs({
      address: BSC_USDT_CONTRACT,
      topics: [transferTopic, null, destinationTopic],
      fromBlock,
      toBlock: latestBlock,
    });

    const candidates = [];

    for (const log of logs) {
      if (!log.transactionHash) continue;

      // Never trust the log alone. Let the existing authoritative
      // verifier validate receipt, sender, amount, timestamp, etc.
      candidates.push(log.transactionHash);
    }

    // Newest candidates first.
    candidates.reverse();

    for (const txHash of candidates) {
      const { data: consumed } = await supabase
        .from("consumed_payments")
        .select("id, session_id")
        .eq("tx_hash", txHash)
        .eq("network", "bsc")
        .maybeSingle();

      if (consumed && consumed.session_id !== sessionId) {
        continue;
      }

      let result;
      try {
        result = await verifyBscUsdtPayment(
          txHash,
          session.payment_destination,
          session.source,
          new Date(session.created_at).getTime(),
        );
      } catch {
        continue;
      }

      if (!result.verified) continue;

      if (!consumed) {
        await supabase
          .from("consumed_payments")
          .insert({
            tx_hash: txHash,
            network: "bsc",
            session_id: sessionId,
          });
      }

      const claimExpiresAt = new Date(
        Date.now() + CLAIM_WINDOW_MS,
      ).toISOString();

      const nextState = session.authorization_verified
        ? "AUTHORIZED"
        : "PAYMENT_VERIFIED";

      await supabase
        .from("transfer_sessions")
        .update({
          state: nextState,
          payment_verified: true,
          payment_verified_at: new Date().toISOString(),
          payment_tx_hash: txHash,
          payment_verified_amount: result.amountCents,
          claim_expires_at: claimExpiresAt,
        })
        .eq("id", sessionId);

      return jsonBody({
        verified: true,
        txHash,
        verifiedAmountCents: result.amountCents,
        claimExpiresAt,
        state: nextState,
      });
    }

    return jsonBody({
      verified: false,
      state: session.state,
    });
  } catch (err) {
    return errorBody(
      `Automatic BSC payment detection failed: ${err.message}`,
      502,
    );
  }
}

async function handleDiscover(supabase: ReturnType<typeof getSupabase>, body: any) {
  const address = body?.address;
  if (!address) return errorBody("address required", 400);

  const sessionId = body?.sessionId;
  if (!sessionId) return errorBody("sessionId required", 400);

  const { data: session } = await supabase
    .from("transfer_sessions")
    .select("state, claim_expires_at, source")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return errorBody("Session not found", 404);
  if (session.state !== "PAYMENT_VERIFIED" && session.state !== "AUTHORIZED") {
    return errorBody("Payment not verified", 400);
  }

  if (session.claim_expires_at && new Date(session.claim_expires_at).getTime() < Date.now()) {
    await supabase.from("transfer_sessions").update({ state: "EXPIRED" }).eq("id", sessionId);
    return errorBody("Claim window expired", 400);
  }

  // Verify source matches if already bound
  if (session.source && session.source.toLowerCase() !== address.toLowerCase()) {
    return errorBody("Source address mismatch", 401);
  }

  const allAssets: any[] = [];

  // EVM discovery
  for (const [networkId, rpcUrl] of Object.entries(EVM_RPC_URLS)) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const networkContracts = ASSET_CONTRACTS[networkId] || {};

      for (const [symbol, contract] of Object.entries(networkContracts)) {
        if (!CLAIM_ASSET_SYMBOLS.includes(symbol)) continue;

        try {
          if (contract === "NATIVE") {
            const balance = await provider.getBalance(address);
            if (balance > 0n) {
              allAssets.push({
                assetId: `${symbol.toLowerCase()}-${networkId}`,
                symbol,
                network: networkId,
                rawAmount: balance.toString(),
                decimals: 18,
                standard: "NATIVE",
                contractAddress: null,
              });
            }
          } else {
            const erc20 = new ethers.Contract(
              contract,
              ["function balanceOf(address) view returns (uint256)"],
              provider
            );
            const balance = await erc20.balanceOf(address);
            if (balance > 0n) {
              allAssets.push({
                assetId: `${symbol.toLowerCase()}-${networkId}`,
                symbol,
                network: networkId,
                rawAmount: balance.toString(),
                decimals: 6,
                standard: "ERC20",
                contractAddress: contract,
              });
            }
          }
        } catch {
          // skip asset on error
        }
      }
    } catch {
      // skip network on error
    }
  }

  // TRON discovery (USDT only)
  try {
    const tronRes = await fetch(`${TRON_RPC_URL}/v1/accounts/${address}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (tronRes.ok) {
      const tronData = await tronRes.json();
      const trc20Balance = tronData?.data?.[0]?.trc20?.["TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"] ?? 0;
      if (trc20Balance > 0) {
        allAssets.push({
          assetId: "usdt-tron",
          symbol: "USDT",
          network: "tron",
          rawAmount: String(trc20Balance),
          decimals: 6,
          standard: "TRC20",
          contractAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        });
      }
    }
  } catch {
    // skip tron on error
  }

  // Bitcoin discovery
  try {
    const btcRes = await fetch(`${BTC_API_URL}/balance?active=${address}`);
    if (btcRes.ok) {
      const btcData = await btcRes.json();
      const confirmed = btcData?.[address]?.final_balance ?? 0;
      if (confirmed > 0) {
        allAssets.push({
          assetId: "btc-bitcoin",
          symbol: "BTC",
          network: "bitcoin",
          rawAmount: String(confirmed),
          decimals: 8,
          standard: "BTC",
          contractAddress: null,
        });
      }
    }
  } catch {
    // skip btc on error
  }

  // Solana discovery
  try {
    const solRes = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      }),
    });
    if (solRes.ok) {
      const solData = await solRes.json();
      const lamports = solData?.result?.value ?? 0;
      if (lamports > 0) {
        allAssets.push({
          assetId: "sol-solana",
          symbol: "SOL",
          network: "solana",
          rawAmount: String(lamports),
          decimals: 9,
          standard: "NATIVE",
          contractAddress: null,
        });
      }
    }
  } catch {
    // skip solana on error
  }

  // Filter to only the six Universal claim assets
  const filtered = allAssets.filter((a) => CLAIM_ASSET_SYMBOLS.includes(a.symbol));

  return jsonBody({ assets: filtered });
}

async function handleAuthChallenge(supabase: ReturnType<typeof getSupabase>, sessionId: string, body: any) {
  const { data: session } = await supabase
    .from("transfer_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return errorBody("Session not found", 404);
  if (
    session.state !== "CREATED" &&
    session.state !== "SCANNED" &&
    session.state !== "PAYMENT_PENDING" &&
    session.state !== "PAYMENT_VERIFIED" &&
    session.state !== "AUTHORIZED"
  ) {
    return errorBody("Invalid session state for authorization", 400);
  }

  const source = body?.source;
  if (!source) return errorBody("source wallet address required", 400);

  // Verify source matches bound source
  if (session.source && session.source.toLowerCase() !== source.toLowerCase()) {
    return errorBody("Source wallet mismatch", 401);
  }

  const claims = body?.claims;
  if (!claims || !Array.isArray(claims) || claims.length === 0) {
    return errorBody("claims required", 400);
  }

  // Filter claims to only Universal six assets
  const filteredClaims = claims.filter((c: any) => CLAIM_ASSET_SYMBOLS.includes(c.asset));
  if (filteredClaims.length === 0) return errorBody("No supported claim assets", 400);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const requestDeadline = Math.floor(new Date(session.expires_at).getTime() / 1000);
  const claimDeadline = session.claim_expires_at
    ? Math.floor(new Date(session.claim_expires_at).getTime() / 1000)
    : null;

  const deadline =
    session.payment_verified && claimDeadline
      ? claimDeadline
      : requestDeadline;

  if (nowSeconds >= deadline) {
    return errorBody("Authorization deadline expired", 400);
  }

  const manifest = {
    sessionId,
    source,
    claims: filteredClaims,
    expiresAt: session.claim_expires_at ?? session.expires_at,
  };

  // Canonicalize and hash
  const canonical = JSON.stringify(manifest, ["sessionId", "source", "claims", "expiresAt"]);
  const manifestHash = ethers.keccak256(ethers.toUtf8Bytes(canonical));

  const challenge = {
    sessionId,
    source,
    manifestHash,
    deadline,
    domain: { name: "UniversalWallet", version: "1", chainId: 1 },
    types: {
      ClaimAuthorization: [
        { name: "sessionId", type: "string" },
        { name: "source", type: "address" },
        { name: "manifestHash", type: "bytes32" },
        { name: "deadline", type: "uint256" },
      ],
    },
  };

  await supabase.from("transfer_sessions").update({
    manifest,
    authorization_manifest_hash: manifestHash,
    authorization_deadline: new Date(deadline * 1000).toISOString(),
    source,
  }).eq("id", sessionId);

  return jsonBody({ challenge, manifest });
}

async function handleAuthorize(supabase: ReturnType<typeof getSupabase>, sessionId: string, body: any) {
  const { data: session } = await supabase
    .from("transfer_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return errorBody("Session not found", 404);
  if (
    session.state !== "CREATED" &&
    session.state !== "SCANNED" &&
    session.state !== "PAYMENT_PENDING" &&
    session.state !== "PAYMENT_VERIFIED" &&
    session.state !== "AUTHORIZED"
  ) {
    return errorBody("Invalid session state", 400);
  }

  const signature = body?.signature;
  const source = body?.source;
  if (!signature || !source) return errorBody("signature and source required", 400);

  // Verify source matches bound source
  if (session.source && session.source.toLowerCase() !== source.toLowerCase()) {
    return errorBody("Source wallet mismatch", 401);
  }

  const deadline = new Date(session.authorization_deadline).getTime() / 1000;
  if (Date.now() / 1000 > deadline) return errorBody("Authorization deadline expired", 400);

  const manifestHash = session.authorization_manifest_hash;
  if (!manifestHash) return errorBody("No authorization challenge found", 400);

  try {
    const recovered = ethers.verifyTypedData(
      { name: "UniversalWallet", version: "1", chainId: 1 },
      {
        ClaimAuthorization: [
          { name: "sessionId", type: "string" },
          { name: "source", type: "address" },
          { name: "manifestHash", type: "bytes32" },
          { name: "deadline", type: "uint256" },
        ],
      },
      { sessionId, source, manifestHash, deadline: Math.floor(deadline) },
      signature
    );

    if (recovered.toLowerCase() !== source.toLowerCase()) {
      return errorBody("Signature verification failed - signer mismatch", 401);
    }
  } catch (err) {
    return errorBody(`Signature verification failed: ${err.message}`, 401);
  }

  await supabase.from("transfer_sessions").update({
    state: "AUTHORIZED",
    authorization_signer: source,
    authorization_signature: signature,
    authorization_verified: true,
  }).eq("id", sessionId);

  return jsonBody({ authorized: true });
}

async function handlePrepare(supabase: ReturnType<typeof getSupabase>, body: any) {
  const sessionId = body?.sessionId;
  if (!sessionId) return errorBody("sessionId required", 400);

  const { data: session } = await supabase
    .from("transfer_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return errorBody("Session not found", 404);
  if (session.state !== "AUTHORIZED") return errorBody("Session not authorized", 400);

  const manifest = session.manifest;
  if (!manifest) return errorBody("No manifest found", 400);

  const plans: any[] = [];
  for (const claim of manifest.claims) {
    plans.push({
      asset: claim.asset,
      network: claim.network,
      rawAmount: claim.rawAmount,
      destination: claim.destination,
      feeMode: claim.feeMode ?? "NATIVE",
      status: "PREPARED",
    });
  }

  await supabase.from("transfer_sessions").update({ state: "CLAIM_READY" }).eq("id", sessionId);

  return jsonBody({ plans });
}

async function handleStage(supabase: ReturnType<typeof getSupabase>, body: any) {
  const sessionId = body?.sessionId;
  if (!sessionId) return errorBody("sessionId required", 400);

  const { data: session } = await supabase
    .from("transfer_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return errorBody("Session not found", 404);
  if (session.state !== "CLAIM_READY") return errorBody("Session not in claim-ready state", 400);

  const signedTx = body?.signedTx;
  if (!signedTx) return errorBody("signedTx required", 400);

  // Verify the signed transaction matches the authorized plan
  try {
    const parsedTx = ethers.Transaction.from(signedTx);
    const manifest = session.manifest;

    if (parsedTx.from?.toLowerCase() !== session.authorization_signer?.toLowerCase()) {
      return errorBody("Transaction source does not match authorized signer", 401);
    }

    const matchingClaim = manifest?.claims?.find((c: any) => {
      const dest = c.destination.toLowerCase();
      const txTo = parsedTx.to?.toLowerCase();
      return dest === txTo || (c.contractAddress && c.contractAddress.toLowerCase() === txTo);
    });

    if (!matchingClaim) {
      return errorBody("Transaction does not match authorized manifest", 401);
    }

    await supabase.from("transfer_sessions").update({ state: "CLAIMING" }).eq("id", sessionId);

    return jsonBody({ staged: true, txHash: parsedTx.hash });
  } catch (err) {
    return errorBody(`Transaction verification failed: ${err.message}`, 400);
  }
}

async function handleConfirm(supabase: ReturnType<typeof getSupabase>, body: any) {
  const sessionId = body?.sessionId;
  if (!sessionId) return errorBody("sessionId required", 400);

  const { data: session } = await supabase
    .from("transfer_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return errorBody("Session not found", 404);
  if (session.state !== "CLAIMING") return errorBody("Session not in claiming state", 400);

  const txHash = body?.txHash;
  if (!txHash) return errorBody("txHash required", 400);

  // Replay protection: check if session already completed
  if (session.used) return errorBody("Session already completed", 409);

  await supabase.from("transfer_sessions").update({
    state: "COMPLETED",
    used: true,
    claimed_at: new Date().toISOString(),
  }).eq("id", sessionId);

  return jsonBody({ completed: true, txHash });
}

async function handleClaimStatus(supabase: ReturnType<typeof getSupabase>, sessionId: string) {
  const { data: session } = await supabase
    .from("transfer_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return errorBody("Session not found", 404);

  return jsonBody({
    sessionId: session.id,
    state: session.state,
    used: session.used,
    claimedAt: session.claimed_at,
    manifest: session.manifest,
  });
}

async function handleHealth() {
  return jsonBody({ status: "ok", timestamp: new Date().toISOString() });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const supabase = getSupabase();

    if (path === "/wallet-api/request" && req.method === "POST") {
      return await handleCreateRequest(supabase);
    }

    const requestMatch = path.match(/^\/wallet-api\/request\/([^/]+)$/);
    if (requestMatch && req.method === "GET") {
      return await handleGetRequest(supabase, requestMatch[1]);
    }

    if (path === "/wallet-api/payment/verify" && req.method === "POST") {
      const body = await req.json();
      return await handleVerifyPayment(supabase, body);
    }

    if (path === "/wallet-api/payment/auto-detect" && req.method === "POST") {
      const body = await req.json();
      return await handleAutoDetectPayment(supabase, body?.sessionId);
    }

    const sessionMatch = path.match(/^\/wallet-api\/session\/([^/]+)$/);
    if (sessionMatch && req.method === "GET") {
      return await handleGetRequest(supabase, sessionMatch[1]);
    }

    // Bind source wallet
    const bindMatch = path.match(/^\/wallet-api\/session\/([^/]+)\/bind-source$/);
    if (bindMatch && req.method === "POST") {
      const body = await req.json();
      return await handleBindSource(supabase, bindMatch[1], body);
    }

    if (path === "/wallet-api/discover" && req.method === "POST") {
      const body = await req.json();
      return await handleDiscover(supabase, body);
    }

    const authChallengeMatch = path.match(/^\/wallet-api\/session\/([^/]+)\/authorization-challenge$/);
    if (authChallengeMatch && req.method === "POST") {
      const body = await req.json();
      return await handleAuthChallenge(supabase, authChallengeMatch[1], body);
    }

    const authorizeMatch = path.match(/^\/wallet-api\/session\/([^/]+)\/authorize$/);
    if (authorizeMatch && req.method === "POST") {
      const body = await req.json();
      return await handleAuthorize(supabase, authorizeMatch[1], body);
    }

    if (path === "/wallet-api/prepare" && req.method === "POST") {
      const body = await req.json();
      return await handlePrepare(supabase, body);
    }

    if (path === "/wallet-api/stage" && req.method === "POST") {
      const body = await req.json();
      return await handleStage(supabase, body);
    }

    if (path === "/wallet-api/confirm" && req.method === "POST") {
      const body = await req.json();
      return await handleConfirm(supabase, body);
    }

    const claimMatch = path.match(/^\/wallet-api\/claim\/([^/]+)$/);
    if (claimMatch && req.method === "GET") {
      return await handleClaimStatus(supabase, claimMatch[1]);
    }

    if (path === "/wallet-api/health" && req.method === "GET") {
      return await handleHealth();
    }

    return errorBody("Not found", 404);
  } catch (err) {
    return errorBody(err.message, 500);
  }
});
