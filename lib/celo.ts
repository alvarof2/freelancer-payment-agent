import { createHash, randomUUID } from "node:crypto";
import { formatSettlementAmount } from "@/lib/format";
import { inferInvoicePaymentMode } from "@/lib/payment-mode";
import { Invoice, PaymentMode, PaymentRequest, PaymentVerificationResult, SettlementAsset } from "@/lib/types";

export interface PaymentPollCandidate {
  txHash: string;
  blockNumber?: number;
  mode: PaymentMode;
  source: "erc20-transfer-log" | "native-transfer-scan";
}

export const CELO_SEPOLIA = {
  chainId: Number(process.env.CELO_SEPOLIA_CHAIN_ID || "11142220"),
  name: "Celo Sepolia",
  networkKey: "celo-sepolia",
  rpcUrl: process.env.CELO_SEPOLIA_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org",
  explorerBaseUrl: "https://celo-sepolia.blockscout.com",
  nativeCurrency: { symbol: "CELO", decimals: 18 },
  stableToken: {
    symbol: process.env.NEXT_PUBLIC_CELO_STABLE_SYMBOL || "USDC",
    decimals: Number(process.env.NEXT_PUBLIC_CELO_STABLE_DECIMALS || "6"),
    address: process.env.CELO_SEPOLIA_STABLE_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_CELO_SEPOLIA_STABLE_TOKEN_ADDRESS || "",
  },
} as const;

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function hash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function toPaddedTopicAddress(address: string) {
  return `0x${normalizeAddress(address).replace(/^0x/, "").padStart(64, "0")}`;
}

export function parseUnits(value: number, decimals: number) {
  const [whole, fraction = ""] = value.toString().split(".");
  const fractionPadded = `${fraction}${"0".repeat(decimals)}`.slice(0, decimals);
  return BigInt(whole || "0") * (BigInt(10) ** BigInt(decimals)) + BigInt(fractionPadded || "0");
}

function formatExplorerTx(txHash: string) {
  return `${CELO_SEPOLIA.explorerBaseUrl}/tx/${txHash}`;
}

export function hasStableTokenConfigured() {
  return Boolean(CELO_SEPOLIA.stableToken.address);
}

export function resolvePaymentMode(requestedMode?: PaymentMode): PaymentMode {
  if (requestedMode === "stable") return hasStableTokenConfigured() ? "stable" : "native";
  if (requestedMode === "native") return "native";
  return hasStableTokenConfigured() ? "stable" : "native";
}

export function resolveInvoicePaymentMode(invoice: Invoice, requestedMode?: PaymentMode): PaymentMode {
  if (requestedMode) return resolvePaymentMode(requestedMode);
  return inferInvoicePaymentMode(invoice, hasStableTokenConfigured());
}

function getSettlementConfig(mode: PaymentMode) {
  if (mode === "stable") {
    const settlementAsset: SettlementAsset = {
      code: CELO_SEPOLIA.stableToken.symbol,
      kind: "token",
      decimals: CELO_SEPOLIA.stableToken.decimals,
      tokenAddress: CELO_SEPOLIA.stableToken.address,
    };

    return {
      mode,
      settlementAsset,
      routeLabel: `Celo Checkout / ${CELO_SEPOLIA.name} / ${settlementAsset.code}`,
      feeEstimate: "Network fee paid in CELO",
      explorerUrl: `${CELO_SEPOLIA.explorerBaseUrl}/token/${CELO_SEPOLIA.stableToken.address}`,
      statusCopy: `Payment request ready for ${settlementAsset.code} on ${CELO_SEPOLIA.name}. Open a wallet or paste a transaction hash after sending.`,
      verificationSummary: (recipient: string) => `${settlementAsset.code} transfer to ${shortAddress(recipient)} verified on ${CELO_SEPOLIA.name}.`,
    };
  }

  const settlementAsset: SettlementAsset = {
    code: CELO_SEPOLIA.nativeCurrency.symbol,
    kind: "native",
    decimals: CELO_SEPOLIA.nativeCurrency.decimals,
  };

  return {
    mode,
    settlementAsset,
    routeLabel: `Celo Checkout / ${CELO_SEPOLIA.name} / Native ${settlementAsset.code}`,
    feeEstimate: "Value and gas are both paid in CELO",
    explorerUrl: CELO_SEPOLIA.explorerBaseUrl,
    statusCopy: `Payment request ready for native ${settlementAsset.code} on ${CELO_SEPOLIA.name}. Open a wallet or paste a transaction hash after sending.`,
    verificationSummary: (recipient: string) => `Native ${settlementAsset.code} transfer to ${shortAddress(recipient)} verified on ${CELO_SEPOLIA.name}.`,
  };
}

export function buildPaymentRequest(invoice: Invoice, requestedMode?: PaymentMode): PaymentRequest {
  const mode = resolveInvoicePaymentMode(invoice, requestedMode);
  const config = getSettlementConfig(mode);
  const reference = `sep-${invoice.id.slice(-6)}-${invoice.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 6)}`;
  const sessionId = `cp_${hash(`${invoice.id}:${mode}:${Date.now()}:${randomUUID()}`).slice(0, 12)}`;
  const memo = `${invoice.projectName} • ${reference}`;
  const amountBaseUnits = parseUnits(invoice.display.amount, config.settlementAsset.decimals).toString();
  const deepLinkParams = new URLSearchParams({
    address: invoice.recipientAddress,
    amount: invoice.display.amount.toString(),
    token: config.settlementAsset.code,
    chainId: String(CELO_SEPOLIA.chainId),
    reference,
    memo,
    paymentMode: mode,
  });

  if (config.settlementAsset.tokenAddress) {
    deepLinkParams.set("tokenAddress", config.settlementAsset.tokenAddress);
  }

  return {
    invoiceId: invoice.id,
    sessionId,
    mode,
    state: "quote_ready",
    wallet: "Celo-compatible wallet",
    routeLabel: config.routeLabel,
    network: CELO_SEPOLIA.name,
    networkKey: CELO_SEPOLIA.networkKey,
    chainId: CELO_SEPOLIA.chainId,
    rpcUrl: CELO_SEPOLIA.rpcUrl,
    settlementAsset: config.settlementAsset,
    amount: invoice.display.amount,
    amountFormatted: formatSettlementAmount(invoice.display.amount, config.settlementAsset),
    amountBaseUnits,
    recipient: invoice.recipientAddress,
    recipientShort: shortAddress(invoice.recipientAddress),
    feeEstimate: config.feeEstimate,
    reference,
    memo,
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    deepLink: `minipay://pay?${deepLinkParams.toString()}`,
    checkoutUrl: `/pay/${invoice.id}`,
    estimatedArrival: "Usually within a few Celo Sepolia blocks after broadcast",
    explorerUrl: config.explorerUrl,
    statusCopy: config.statusCopy,
  };
}

export async function rpc(method: string, params: unknown[]) {
  const response = await fetch(CELO_SEPOLIA.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });

  const data = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (!response.ok || data.error) throw new Error(data.error?.message || `RPC ${method} failed.`);
  return data.result;
}

export async function findSepoliaPaymentCandidates(invoice: Invoice, requestedMode?: PaymentMode, lookbackBlocks = 120): Promise<PaymentPollCandidate[]> {
  const mode = resolveInvoicePaymentMode(invoice, requestedMode || invoice.paymentRequest?.mode);
  const latestHex = await rpc("eth_blockNumber", []) as string;
  const latestBlock = Number.parseInt(latestHex, 16);
  const fromBlock = Math.max(0, latestBlock - lookbackBlocks);
  const recipient = normalizeAddress(invoice.recipientAddress);
  const candidates = new Map<string, PaymentPollCandidate>();

  if (mode === "stable") {
    if (!CELO_SEPOLIA.stableToken.address) return [];
    const expectedAmount = parseUnits(invoice.display.amount, CELO_SEPOLIA.stableToken.decimals);
    const logs = await rpc("eth_getLogs", [{
      address: CELO_SEPOLIA.stableToken.address,
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: latestHex,
      topics: [TRANSFER_TOPIC, null, toPaddedTopicAddress(recipient)],
    }]) as Array<{ transactionHash?: string; blockNumber?: string; data?: string }>;

    for (const log of logs) {
      if (!log.transactionHash || typeof log.data !== "string") continue;
      if (BigInt(log.data) < expectedAmount) continue;
      candidates.set(log.transactionHash, {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber ? Number.parseInt(log.blockNumber, 16) : undefined,
        mode,
        source: "erc20-transfer-log",
      });
    }

    return [...candidates.values()].sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0));
  }

  const expectedAmount = parseUnits(invoice.display.amount, CELO_SEPOLIA.nativeCurrency.decimals);
  for (let block = latestBlock; block >= fromBlock; block -= 1) {
    const blockData = await rpc("eth_getBlockByNumber", [`0x${block.toString(16)}`, true]) as { transactions?: Array<Record<string, string>> } | null;
    for (const tx of blockData?.transactions ?? []) {
      if (normalizeAddress(tx.to || "") !== recipient) continue;
      const txValue = typeof tx.value === "string" ? BigInt(tx.value) : BigInt(0);
      if (txValue < expectedAmount) continue;
      if (!tx.hash) continue;
      candidates.set(tx.hash, {
        txHash: tx.hash,
        blockNumber: block,
        mode,
        source: "native-transfer-scan",
      });
    }
  }

  return [...candidates.values()].sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0));
}

export async function verifySepoliaPayment(invoice: Invoice, txHash: string, requestedMode?: PaymentMode): Promise<PaymentVerificationResult> {
  const normalizedHash = txHash.trim();
  const mode = resolveInvoicePaymentMode(invoice, requestedMode || invoice.paymentRequest?.mode);
  const config = getSettlementConfig(mode);

  if (!/^0x[a-fA-F0-9]{64}$/.test(normalizedHash)) {
    return { ok: false, reason: "Enter a valid 0x-prefixed transaction hash." };
  }

  const [tx, receipt] = await Promise.all([
    rpc("eth_getTransactionByHash", [normalizedHash]) as Promise<Record<string, string> | null>,
    rpc("eth_getTransactionReceipt", [normalizedHash]) as Promise<{ status?: string; to?: string; blockNumber?: string; logs?: Array<Record<string, unknown>> } | null>,
  ]);

  if (!tx || !receipt) return { ok: false, reason: "Transaction was not found on Celo Sepolia yet." };

  const chainIdHex = tx.chainId || tx.chainID;
  if (chainIdHex && Number.parseInt(chainIdHex, 16) !== CELO_SEPOLIA.chainId) {
    return { ok: false, reason: `Transaction belongs to chain ${Number.parseInt(chainIdHex, 16)}, not Celo Sepolia.` };
  }

  if (receipt.status !== "0x1") return { ok: false, reason: "Transaction reverted or has not succeeded yet." };

  const recipient = normalizeAddress(invoice.recipientAddress);
  const expectedAmount = parseUnits(invoice.display.amount, config.settlementAsset.decimals);

  if (mode === "stable") {
    const logs = (receipt.logs ?? []) as Array<{ address?: string; topics?: string[]; data?: string }>;
    const matchingTransfer = logs.find((log) =>
      normalizeAddress(log.address || "") === normalizeAddress(CELO_SEPOLIA.stableToken.address) &&
      log.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC.toLowerCase() &&
      log.topics?.[2]?.toLowerCase() === toPaddedTopicAddress(recipient).toLowerCase() &&
      typeof log.data === "string" && BigInt(log.data) >= expectedAmount,
    );

    if (!matchingTransfer) {
      return {
        ok: false,
        reason: `No ${config.settlementAsset.code} transfer to ${shortAddress(invoice.recipientAddress)} for at least ${invoice.display.amount} was found in that transaction.`,
        explorerUrl: formatExplorerTx(normalizedHash),
      };
    }
  } else {
    const txRecipient = normalizeAddress(tx.to || receipt.to || "");
    const txValue = typeof tx.value === "string" ? BigInt(tx.value) : BigInt(0);

    if (txRecipient !== recipient) {
      return {
        ok: false,
        reason: `Native CELO transfer recipient ${shortAddress(tx.to || receipt.to || "0x0000000000000000000000000000000000000000")} does not match ${shortAddress(invoice.recipientAddress)}.`,
        explorerUrl: formatExplorerTx(normalizedHash),
      };
    }

    if (txValue < expectedAmount) {
      return {
        ok: false,
        reason: `Native CELO transfer value is below the required ${invoice.display.amount} ${CELO_SEPOLIA.nativeCurrency.symbol}.`,
        explorerUrl: formatExplorerTx(normalizedHash),
      };
    }
  }

  return {
    ok: true,
    txHash: normalizedHash,
    blockNumber: receipt.blockNumber ? Number.parseInt(receipt.blockNumber, 16) : undefined,
    paidAt: new Date().toISOString(),
    explorerUrl: formatExplorerTx(normalizedHash),
    verificationSummary: config.verificationSummary(invoice.recipientAddress),
  };
}
