import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { getAddress, isAddress } from "viem";
import { resolveContractAddress, STUDIONET_CHAIN_ID } from "./config";

export const GENLAYER_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || "61999",
  10
);
export const GENLAYER_CHAIN_ID_HEX = "0xF22F";
export const GENLAYER_CHAIN_ID_HEX_LOWER = "0xf22f";

export const GENLAYER_NETWORK = {
  chainId: GENLAYER_CHAIN_ID_HEX_LOWER,
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

export interface GenLayerConfigValidation {
  isValid: boolean;
  contractAddress?: `0x${string}`;
  chainId: number;
  rpcUrl: string;
  error?: string;
}

/**
 * Validates the GenLayer StudioNet contract address and network configuration.
 */
export function validateGenLayerConfig(customAddress?: string): GenLayerConfigValidation {
  const chainId = GENLAYER_CHAIN_ID;
  const rpcUrl =
    process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ||
    process.env.GENLAYER_RPC_URL ||
    "https://studio.genlayer.com/api";

  // Explicit configuration only: there is NO fallback contract address.
  // Property accesses are literal so Next.js can inline NEXT_PUBLIC_* in the browser bundle.
  const resolved = resolveContractAddress(
    {
      NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS,
      GENCHAT_CONTRACT_ADDRESS: process.env.GENCHAT_CONTRACT_ADDRESS,
    },
    customAddress
  );

  if (!resolved.isValid || !resolved.contractAddress) {
    return { isValid: false, chainId, rpcUrl, error: resolved.error };
  }

  if (chainId !== STUDIONET_CHAIN_ID) {
    return {
      isValid: false,
      contractAddress: resolved.contractAddress,
      chainId,
      rpcUrl,
      error: `Invalid chain ID: ${chainId}. GenChat verification requires GenLayer StudioNet (Chain ID: ${STUDIONET_CHAIN_ID}).`,
    };
  }

  return { isValid: true, contractAddress: resolved.contractAddress, chainId, rpcUrl };
}


export function getContractAddress(): `0x${string}` {
  const validation = validateGenLayerConfig();
  if (!validation.isValid || !validation.contractAddress) {
    throw new Error(validation.error || "Invalid GenLayer configuration");
  }
  return validation.contractAddress;
}

export function getExplorerUrl(txHash?: string): string {
  const base = process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL || "https://studio.genlayer.com";
  if (!txHash) return base;
  return `${base}/tx/${txHash}`;
}

/**
 * Check if browser Ethereum provider (e.g. MetaMask, Rabby) is available.
 * Supports standard EIP-1193 injected providers.
 */
export function getInjectedProvider(): any {
  if (typeof window === "undefined") return null;
  const eth = (window as any).ethereum;
  if (!eth) return null;
  if (eth.providers && Array.isArray(eth.providers) && eth.providers.length > 0) {
    const preferred = eth.providers.find((p: any) => p.isMetaMask || p.isRabby);
    return preferred || eth.providers[0];
  }
  return eth;
}

/**
 * Check if browser Ethereum provider is available without prompting the user.
 */
export function isEthereumAvailable(): boolean {
  return !!getInjectedProvider();
}

/**
 * Determine if a given chain ID matches GenLayer StudioNet (61999 or 0xF22F / 0xf22f)
 */
export function isStudioNet(chainId: number | string | null | undefined): boolean {
  if (!chainId) return false;
  let parsed: number;
  if (typeof chainId === "string") {
    parsed = chainId.startsWith("0x") || chainId.startsWith("0X")
      ? parseInt(chainId, 16)
      : parseInt(chainId, 10);
  } else {
    parsed = chainId;
  }
  return parsed === GENLAYER_CHAIN_ID;
}

/**
 * Get current connected chain ID from wallet without prompting
 */
export async function getConnectedChainId(): Promise<number | null> {
  const provider = getInjectedProvider();
  if (!provider) return null;
  try {
    const chainIdHex = await provider.request({ method: "eth_chainId" });
    if (!chainIdHex) return null;
    return typeof chainIdHex === "string" ? parseInt(chainIdHex, 16) : Number(chainIdHex);
  } catch {
    return null;
  }
}

export const getChainId = getConnectedChainId;

/**
 * Switch to GenLayer StudioNet network in connected wallet.
 * Returns an object with success status and user-facing message.
 * Never throws unhandled exceptions or requests token approvals.
 */
export async function switchToStudioNet(): Promise<{ success: boolean; error?: string }> {
  const provider = getInjectedProvider();
  if (!provider) {
    return {
      success: false,
      error: "No compatible browser wallet was detected. Install MetaMask or another EIP-1193 wallet to use GenLayer verification.",
    };
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID_HEX_LOWER }],
    });
    return { success: true };
  } catch (switchError: any) {
    // Error 4902 indicates chain has not been added to wallet yet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [GENLAYER_NETWORK],
        });
        return { success: true };
      } catch (addError: any) {
        if (addError.code === 4001 || /reject|denied|cancel/i.test(addError.message)) {
          return {
            success: false,
            error: "StudioNet switch was cancelled. Verification was not submitted.",
          };
        }
        return {
          success: false,
          error: addError.message || "Failed to add GenLayer StudioNet to wallet.",
        };
      }
    }

    if (switchError.code === 4001 || /reject|denied|cancel/i.test(switchError.message)) {
      return {
        success: false,
        error: "StudioNet switch was cancelled. Verification was not submitted.",
      };
    }

    return {
      success: false,
      error: switchError.message || "Failed to switch to GenLayer StudioNet.",
    };
  }
}

/**
 * Backward compatibility alias for switchToStudioNet
 */
export async function ensureGenLayerNetwork(): Promise<void> {
  const result = await switchToStudioNet();
  if (!result.success && result.error) {
    throw new Error(result.error);
  }
}

/**
 * Request user's wallet account explicitly via EIP-1193 eth_requestAccounts.
 * Called ONLY upon explicit user action inside the verification modal.
 */
export async function connectWallet(): Promise<string> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error(
      "No compatible browser wallet was detected. Install MetaMask or another EIP-1193 wallet to use GenLayer verification."
    );
  }
  try {
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    });
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found in wallet.");
    }
    if (!isAddress(accounts[0], { strict: false })) {
      throw new Error(`Invalid wallet address returned from provider: "${accounts[0]}"`);
    }
    return getAddress(accounts[0]);
  } catch (err: any) {
    if (err.code === 4001 || /reject|denied|cancel/i.test(err.message)) {
      throw new Error(
        "Wallet connection cancelled. You can continue using GenChat without a wallet."
      );
    }
    throw new Error(err.message || "Failed to connect wallet.");
  }
}

/**
 * Retrieve the currently connected wallet account without prompting, or null
 */
export async function getConnectedAccount(): Promise<string | null> {
  const provider = getInjectedProvider();
  if (!provider) return null;
  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    if (accounts && accounts.length > 0 && isAddress(accounts[0], { strict: false })) {
      return getAddress(accounts[0]);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Creates a GenLayer client instance.
 * Connects the injected EIP-1193 browser wallet as the signing provider.
 * When accountAddress is provided:
 * - config.account is set to the checksummed address string (NOT an object) so that
 *   genlayer-js getCustomTransportConfig recognizes `typeof config.account !== 'object'`
 *   as TRUE, routing all eth_* requests (including eth_sendTransaction) to the browser wallet
 *   provider and NOT to the GenLayer node RPC (which does not support eth_sendTransaction).
 * - viem automatically configures client.account = { address, type: 'json-rpc' } so that
 *   writeContract can extract validatedSenderAccount.address without undefined errors.
 */
export function getGenLayerClient(accountAddress?: string | { address: string }) {
  const config: any = {
    chain: studionet,
    endpoint:
      process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ||
      process.env.GENLAYER_RPC_URL ||
      "https://studio.genlayer.com/api",
  };

  const provider = getInjectedProvider();
  if (provider) {
    config.provider = provider;
  }

  if (accountAddress) {
    const raw = typeof accountAddress === "string" ? accountAddress : accountAddress.address;
    if (!raw || !isAddress(raw, { strict: false })) {
      throw new Error(
        `Invalid wallet account address: "${raw}". Expected a valid Ethereum address.`
      );
    }
    // CRITICAL: config.account must be the string address so genlayer-js customTransport
    // knows to forward eth_sendTransaction to the connected browser wallet provider.
    config.account = getAddress(raw);
  }

  return createClient(config);
}
