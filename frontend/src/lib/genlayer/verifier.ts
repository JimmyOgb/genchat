import { getAddress, isAddress } from "viem";
import { getContractAddress, getExplorerUrl, getGenLayerClient } from "./client";
import { resolveContractAddress } from "./config";
import { buildRequestArgs, decodeVerificationRecord } from "./protocol";
import type {
  VerificationDecision,
  VerificationReceipt,
  VerificationRecord,
  VerificationRequest,
  VerificationStatus,
} from "./types";

export class GenLayerVerifierService {
  private contractAddress: `0x${string}`;

  constructor(contractAddress?: string) {
    if (contractAddress) {
      const resolved = resolveContractAddress({}, contractAddress);
      if (!resolved.isValid || !resolved.contractAddress) {
        throw new Error(
          resolved.error || `Invalid contract address provided to GenLayerVerifierService: "${contractAddress}".`
        );
      }
      this.contractAddress = resolved.contractAddress;
    } else {
      this.contractAddress = getContractAddress();
    }
  }

  getContractAddress(): `0x${string}` {
    return this.contractAddress;
  }

  isConfigured(): boolean {
    return !!this.contractAddress && isAddress(this.contractAddress, { strict: false });
  }

  /**
   * Submits a real verification request transaction to GenLayer StudioNet.
   * Runs independent AI validator consensus with source retrieval & content hash binding.
   */
  async submitVerification(
    request: VerificationRequest,
    senderAddress?: string,
    onProgress?: (status: VerificationStatus, message: string, txHash?: string) => void
  ): Promise<VerificationReceipt> {
    if (!this.isConfigured()) {
      throw new Error(
        "NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS is not set. Configure the current StudioNet deployment (see .env.example)."
      );
    }

    if (!senderAddress || !isAddress(senderAddress, { strict: false })) {
      throw new Error(
        `Valid wallet account is required to submit a GenLayer verification. Received: "${senderAddress}"`
      );
    }

    const checksummedSender = getAddress(senderAddress);
    const client = getGenLayerClient(checksummedSender);

    try {
      onProgress?.(
        "AWAITING_WALLET",
        "Confirm the verification transaction in your wallet."
      );

      // 1. Submit write transaction to the intelligent contract using connected user account via browser wallet
      const txHash = await client.writeContract({
        account: client.account,
        address: this.contractAddress,
        functionName: "request_verification",
        args: buildRequestArgs(request),
        value: BigInt(0),
      });

      onProgress?.(
        "WALLET_SUBMITTED",
        "Transaction confirmed in wallet. Submitting to StudioNet...",
        txHash
      );

      onProgress?.(
        "PROCESSING",
        "GenLayer validators are independently retrieving external source evidence...",
        txHash
      );

      onProgress?.(
        "CONSENSUS",
        "GenLayer validators are verifying canonical hashes and reaching consensus...",
        txHash
      );

      // 2. Poll for network receipt (ACCEPTED/FINALIZED consensus)
      const receipt = await this.waitForVerification(txHash);

      // Check consensus outcome
      const statusNum = Number(receipt?.status);
      const statusName = String(receipt?.statusName || "");
      const resultName = String(receipt?.result_name || receipt?.result || "");

      if (statusNum === 8 || statusName === "CANCELED") {
        throw new Error("GenLayer processing failure: Transaction was cancelled.");
      }
      if (statusNum === 12 || statusName === "VALIDATORS_TIMEOUT") {
        throw new Error("Consensus failure: Validator timeout occurred.");
      }
      if (statusNum === 13 || statusName === "LEADER_TIMEOUT") {
        throw new Error("Consensus failure: Leader timeout occurred.");
      }
      if (statusNum === 6 || statusName === "UNDETERMINED") {
        throw new Error("Consensus failure: GenLayer validators could not reach determinism.");
      }
      if (resultName === "FAILURE" || resultName === "DETERMINISTIC_VIOLATION") {
        throw new Error(`Consensus failure: Consensus result was ${resultName}.`);
      }

      onProgress?.(
        "FINALIZED",
        "Verification finalized on GenLayer.",
        txHash
      );

      // 3. Read the finalized on-chain record. If it cannot be read or decoded, fail
      //    loudly instead of inventing a decision.
      let record: VerificationRecord;
      try {
        record = await this.getVerificationRecord(request.verificationId);
      } catch (readErr: any) {
        throw new Error(
          `Finalization failure: Could not retrieve a valid verification record from the GenLayer contract (${readErr?.message || "unknown error"}).`
        );
      }
      record.transactionHash = txHash;
      record.explorerUrl = getExplorerUrl(txHash);

      if (record.decision === "APPROVED") {
        onProgress?.("VERIFIED", "Verification confirmed on-chain (Evidence Verified).", txHash);
      } else if (record.decision === "REJECTED") {
        onProgress?.("REJECTED", "Verification rejected by validators on-chain.", txHash);
      } else {
        onProgress?.("INCONCLUSIVE", "Verification inconclusive on-chain.", txHash);
      }

      return {
        status: "ACCEPTED",
        transactionHash: txHash,
        decision: record.decision,
        confidence: record.confidence,
        rationale: record.rationale,
        evidenceVerified: record.evidenceVerified,
        actualEvidenceHash: record.actualEvidenceHash,
        plainText: record.plainText,
        record,
      };

    } catch (err: any) {
      console.error("GenLayer transaction error:", err);
      if (err.code === 4001 || /reject|denied|cancelled|user rejected/i.test(err.message)) {
        throw new Error("User rejected the verification transaction in your wallet.");
      }
      throw err;
    }
  }

  /**
   * Awaits transaction receipt reaching ACCEPTED status on StudioNet.
   */
  async waitForVerification(txHash: string): Promise<any> {
    const client = getGenLayerClient();
    return await client.waitForTransactionReceipt({
      hash: txHash as any,
      status: "ACCEPTED" as any,
      retries: 50,
      interval: 3500,
    });
  }

  /**
   * Reads a verified record from the contract by verification ID (Structured).
   */
  async getVerificationRecord(verificationId: string): Promise<VerificationRecord> {
    if (!this.isConfigured()) {
      throw new Error("NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS is not set.");
    }

    const client = getGenLayerClient();
    const rawData: unknown = await client.readContract({
      address: this.contractAddress,
      functionName: "get_verification",
      args: [verificationId],
    });

    // Strict decode against the contract's actual schema (throws on malformed data).
    const record = decodeVerificationRecord(rawData);

    // Plaintext is an optional convenience view; omit it if unavailable rather than fabricating.
    try {
      record.plainText = await this.getVerificationText(verificationId);
    } catch {
      // leave plainText undefined
    }

    record.explorerUrl = getExplorerUrl();
    return record;
  }


  /**
   * Reads human-readable plaintext verification string from the contract.
   * Format: "<DECISION> — <CONFIDENCE>% confidence. [Evidence: VERIFIED/UNVERIFIED] <RATIONALE>"
   */
  async getVerificationText(verificationId: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS is not set.");
    }

    const client = getGenLayerClient();
    const result: any = await client.readContract({
      address: this.contractAddress,
      functionName: "get_verification_text",
      args: [verificationId],
    });

    return typeof result === "string" ? result : String(result);
  }

  /**
   * Reads the finalized consensus decision as plaintext:
   * "APPROVED", "REJECTED", or "INCONCLUSIVE".
   */
  async getVerificationDecision(verificationId: string): Promise<VerificationDecision> {
    if (!this.isConfigured()) {
      throw new Error("NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS is not set.");
    }

    const client = getGenLayerClient();
    const result: any = await client.readContract({
      address: this.contractAddress,
      functionName: "get_verification_decision",
      args: [verificationId],
    });

    const dec = String(result).trim().toUpperCase();
    return (dec as VerificationDecision) || "INCONCLUSIVE";
  }

  /**
   * Retrieves the total count of on-chain verifications.
   */
  async getVerificationCount(): Promise<number> {
    if (!this.isConfigured()) return 0;
    try {
      const client = getGenLayerClient();
      const count = await client.readContract({
        address: this.contractAddress,
        functionName: "get_verification_count",
        args: [],
      });
      return Number(count);
    } catch (e) {
      console.error("Error reading verification count:", e);
      return 0;
    }
  }
}
