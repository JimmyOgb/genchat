import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const GENLAYER_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || "61999",
  10
);
export const GENLAYER_CHAIN_ID_HEX = `0x${GENLAYER_CHAIN_ID.toString(16).toUpperCase()}`;

export const GENLAYER_NETWORK = {
  chainId: GENLAYER_CHAIN_ID_HEX,
  chainName: process.env.NEXT_PUBLIC_GENLAYER_CHAIN_NAME || "GenLayer StudioNet",
  nativeCurrency: {
    name: "GenLayer Token",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: [
    process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
  ],
  blockExplorerUrls: [
    process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL || "https://studio.genlayer.com",
  ],
};

export function getContractAddress(): string {
  return (
    process.env.NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS ||
    process.env.GENCHAT_CONTRACT_ADDRESS ||
    ""
  );
}

export function getExplorerUrl(txHash?: string): string {
  const base = process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL || "https://studio.genlayer.com";
  if (!txHash) return base;
  return `${base}/tx/${txHash}`;
}

/**
 * Check if browser Ethereum provider (e.g. MetaMask) is available
 */
export function isEthereumAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).ethereum;
}

/**
 * Request user's MetaMask accounts
 */
export async function connectWallet(): Promise<string> {
  if (!isEthereumAvailable()) {
    throw new Error("MetaMask is not installed. Please install MetaMask to sign GenLayer transactions.");
  }
  const ethereum = (window as any).ethereum;
  try {
    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found in MetaMask.");
    }
    return accounts[0];
  } catch (err: any) {
    if (err.code === 4001) {
      throw new Error("Connection request was rejected in MetaMask.");
    }
    throw new Error(err.message || "Failed to connect MetaMask.");
  }
}

/**
 * Creates a GenLayer client instance.
 * If account is provided, writes are signed with that account.
 * If omitted, client performs view calls.
 */
export function getGenLayerClient(accountAddress?: string) {
  const config: any = {
    chain: studionet,
    endpoint: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
  };

  if (accountAddress) {
    config.account = accountAddress as `0x${string}`;
  }

  return createClient(config);
}
