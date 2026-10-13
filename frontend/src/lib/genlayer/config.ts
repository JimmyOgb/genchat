import { getAddress, isAddress } from "viem";

/**
 * Pure, side-effect-free GenChat contract configuration logic.
 * Kept free of relative imports so it can be unit-tested offline under plain Node.
 *
 * Policy: there is NO built-in default contract address. The deployment must be
 * explicitly configured through NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS.
 */

export const STUDIONET_CHAIN_ID = 61999;

/**
 * Contract deployments that are superseded and must never be used.
 * Present only so the application can refuse them with a clear error.
 */
export const DEPRECATED_CONTRACT_ADDRESSES: readonly string[] = [
  "0x1b06F421f1d7228aC34f087f37309456D2434344",
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface ContractEnv {
  NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS?: string;
  /** Legacy server-side variable. Only tolerated if it is identical to the public one. */
  GENCHAT_CONTRACT_ADDRESS?: string;
}

export interface ContractAddressResult {
  isValid: boolean;
  contractAddress?: `0x${string}`;
  error?: string;
}

export function isDeprecatedContractAddress(address: string): boolean {
  const lower = address.trim().toLowerCase();
  return DEPRECATED_CONTRACT_ADDRESSES.some((a) => a.toLowerCase() === lower);
}

function clean(value: string | undefined | null): string {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (v === "undefined" || v === "null") return "";
  return v;
}

/**
 * Resolves and validates the GenChat contract address from explicit configuration only.
 * Never falls back to a hardcoded address.
 */
export function resolveContractAddress(
  env: ContractEnv,
  override?: string
): ContractAddressResult {
  const configured = clean(override) || clean(env.NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS);

  if (!configured) {
    return {
      isValid: false,
      error:
        "GenChat contract address is not configured. Set NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS to the current StudioNet deployment (see .env.example).",
    };
  }

  if (!isAddress(configured, { strict: false })) {
    return {
      isValid: false,
      error: `Invalid GenChat contract address: "${configured}". Must be a 0x-prefixed 20-byte hex address.`,
    };
  }

  if (configured.toLowerCase() === ZERO_ADDRESS) {
    return { isValid: false, error: "GenChat contract address must not be the zero address." };
  }

  if (isDeprecatedContractAddress(configured)) {
    return {
      isValid: false,
      error: `Contract address ${configured} is a deprecated GenChat deployment and cannot be used. Point NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS at the current evidence-bound deployment.`,
    };
  }

  const legacy = clean(env.GENCHAT_CONTRACT_ADDRESS);
  if (!override && legacy && legacy.toLowerCase() !== configured.toLowerCase()) {
    return {
      isValid: false,
      error:
        "GENCHAT_CONTRACT_ADDRESS differs from NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS. The API and frontend must target the same contract; remove GENCHAT_CONTRACT_ADDRESS or make them identical.",
    };
  }

  return { isValid: true, contractAddress: getAddress(configured) };
}
