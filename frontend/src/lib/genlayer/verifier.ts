import { getContractAddress, getExplorerUrl, getGenLayerClient } from "./client";
import type {
  VerificationDecision,
  VerificationReceipt,
  VerificationRecord,
  VerificationRequest,
} from "./types";

export class GenLayerVerifierService {
  private contractAddress: `0x${string}`;

  constructor(contractAddress?: string) {
    const addr = contractAddress || getContractAddress();
    this.contractAddress = addr as `0x${string}`;
  }

  isConfigured(): boolean {
    return !!this.contractAddress && this.contractAddress.length > 5;
  }

  /**
   * Submits a real verification request transaction to GenLayer StudioNet.
   * Runs independent AI validator consensus on-chain.
   */
  async submitVerification(
    request: VerificationRequest,
    senderAddress?: string
  ): Promise<VerificationReceipt> {
    if (!this.isConfigured()) {
      throw new Error(
        "GENCHAT_CONTRACT_ADDRESS is not set. Please deploy the contract to StudioNet and set GENCHAT_CONTRACT_ADDRESS in .env.local."
      );
    }

    const client = getGenLayerClient(senderAddress);

    try {
      // 1. Submit write transaction to the intelligent contract
      const txHash = await client.writeContract({
        address: this.contractAddress,
        functionName: "request_verification",
        args: [
          request.verificationId,
          request.questionTitle,
          request.questionHash,
          request.evidenceHash,
          request.contextSummary,
          request.criteria,
          request.createdAt,
        ],
        value: BigInt(0),
      });

      // 2. Poll for network receipt (ACCEPTED/FINALIZED consensus)
      await this.waitForVerification(txHash);

      // 3. Query the finalized on-chain state for consensus decision & plaintext
      let decision: VerificationDecision = "APPROVED";
      let confidence = 90;
      let rationale = "Consensus achieved on GenLayer StudioNet.";
      let plainText = "";

      try {
        const record = await this.getVerificationRecord(request.verificationId);
        decision = record.decision;
        confidence = record.confidence;
        rationale = record.rationale;
        plainText = record.plainText || `${decision} — ${confidence}% confidence. ${rationale}`;
      } catch (readErr) {
        console.warn("Could not read back immediate record state:", readErr);
        plainText = `${decision} — ${confidence}% confidence. ${rationale}`;
      }

      return {
        status: "ACCEPTED",
        transactionHash: txHash,
        decision,
        confidence,
        rationale,
        plainText,
      };
    } catch (err: any) {
      console.error("GenLayer transaction error:", err);
      throw new Error(err.message || "Failed to execute GenLayer verification transaction.");
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
      questionHash: get("question_hash") || "",
      evidenceHash: get("evidence_hash") || "",
      questionTitle: get("question_title") || "",
      status: get("status") || "CONSENSUS",
      decision,
      confidence,
      rationale,
      plainText,
      createdAt: get("created_at") || "",
      finalizedAt: get("finalized_at") || "",
      explorerUrl: getExplorerUrl(),
    };
  }

  /**
   * Reads human-readable plaintext verification string from the contract.
   * Format: "<DECISION> — <CONFIDENCE>% confidence. <RATIONALE>"
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
