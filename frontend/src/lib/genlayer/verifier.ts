import { getAddress, isAddress } from "viem";
import { getContractAddress, getExplorerUrl, getGenLayerClient } from "./client";
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
      if (!isAddress(contractAddress, { strict: false })) {
        throw new Error(
          `Invalid contract address provided to GenLayerVerifierService: "${contractAddress}". Must be a valid 20-byte Ethereum address.`
        );
      }
      this.contractAddress = getAddress(contractAddress);
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
        "GENCHAT_CONTRACT_ADDRESS is not set. Please deploy the contract to StudioNet and set NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS in .env.local."
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
        args: [
          request.verificationId,
          request.questionTitle,
          request.questionHash,
          request.expectedEvidenceHash,
          JSON.stringify(request.sourceUrls),
          request.criteria,
          request.userContextSummary,
          request.createdAt,
        ],
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

      // 3. Query the finalized on-chain state for real consensus decision & plaintext
      let decision: VerificationDecision = "INCONCLUSIVE";
      let confidence = 0;
      let rationale = "";
      let plainText = "";
      let evidenceVerified = false;
      let actualEvidenceHash = "";

      try {
        const record = await this.getVerificationRecord(request.verificationId);
        decision = record.decision || "INCONCLUSIVE";
        confidence = record.confidence ?? 0;
        rationale = record.rationale || "";
        evidenceVerified = record.evidenceVerified;
        actualEvidenceHash = record.actualEvidenceHash;
        plainText = record.plainText || `${decision} — ${confidence}% confidence. ${rationale}`;
      } catch (readErr: any) {
        console.warn("Could not read back immediate record state:", readErr);
        try {
          plainText = await this.getVerificationText(request.verificationId);
          decision = await this.getVerificationDecision(request.verificationId);
          rationale = plainText;
        } catch {
          throw new Error("Finalization failure: Could not retrieve final verification record from GenLayer contract.");
        }
      }

      if (decision === "APPROVED") {
        onProgress?.("VERIFIED", "Verification confirmed on-chain (Evidence Verified).", txHash);
      } else if (decision === "REJECTED") {
        onProgress?.("REJECTED", "Verification rejected by validators on-chain.", txHash);
      } else {
        onProgress?.("INCONCLUSIVE", "Verification inconclusive on-chain.", txHash);
      }

      return {
        status: "ACCEPTED",
        transactionHash: txHash,
        decision,
        confidence,
        rationale,
        evidenceVerified,
        actualEvidenceHash,
        plainText,
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
      throw new Error("GENCHAT_CONTRACT_ADDRESS is not set.");
    }

    const client = getGenLayerClient();
    const rawData: any = await client.readContract({
      address: this.contractAddress,
      functionName: "get_verification",
      args: [verificationId],
    });

    const get = (key: string): any => {
      if (!rawData) return undefined;
      if (rawData instanceof Map) return rawData.get(key);
      return rawData[key];
    };

    const rawDecision = get("decision");
    const decision = (rawDecision as VerificationDecision) || "PENDING";
    const confidence = Number(get("confidence") || 0);
    const rationale = get("rationale") || "";
    const evidenceVerified = Boolean(get("evidence_verified"));
    const actualEvidenceHash = get("actual_evidence_hash") || "";
    const expectedEvidenceHash = get("expected_evidence_hash") || "";
    let sourceUrls: string[] = [];
    try {
      sourceUrls = JSON.parse(get("source_urls_json") || "[]");
    } catch {
      sourceUrls = [];
    }

    // Fetch plaintext directly from contract's dedicated public view method
    let plainText = `${decision} — ${confidence}% confidence. ${rationale}`;
    try {
      plainText = await this.getVerificationText(verificationId);
    } catch {
      // Fallback to formatted string if separate getter call encounters transient network issue
    }

    return {
      verificationId: get("verification_id") || verificationId,
      requester: get("requester") || "",
      questionTitle: get("question_title") || "",
      questionHash: get("question_hash") || "",
      expectedEvidenceHash,
      actualEvidenceHash,
      sourceUrls,
      evidenceVerified,
      status: get("status") || "CONSENSUS",
      decision,
      confidence,
      rationale,
      userContextSummary: get("user_context_summary") || "",
      plainText,
      createdAt: get("created_at") || "",
      finalizedAt: get("finalized_at") || "",
      explorerUrl: getExplorerUrl(),
    };
  }

  /**
   * Reads human-readable plaintext verification string from the contract.
   * Format: "<DECISION> — <CONFIDENCE>% confidence. [Evidence: VERIFIED/UNVERIFIED] <RATIONALE>"
   */
  async getVerificationText(verificationId: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("GENCHAT_CONTRACT_ADDRESS is not set.");
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
      throw new Error("GENCHAT_CONTRACT_ADDRESS is not set.");
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
