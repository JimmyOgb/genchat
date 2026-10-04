export type VerificationStatus =
  | "IDLE"
  | "PREPARING"
  | "SUBMITTING"
  | "SUBMITTED"
  | "ADJUDICATING"
  | "CONSENSUS"
  | "FINALIZED"
  | "FAILED";

export type VerificationDecision =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "INCONCLUSIVE";

export interface VerificationRequest {
  verificationId: string;
  questionTitle: string;
  questionHash: string;
  evidenceHash: string;
  contextSummary: string;
  criteria: string;
  createdAt: string;
}

export interface VerificationRecord {
  verificationId: string;
  requester: string;
  questionHash: string;
  evidenceHash: string;
  questionTitle: string;
  status: string;
  decision: VerificationDecision;
  confidence: number;
  rationale: string;
  plainText?: string;
  createdAt: string;
  finalizedAt: string;
  transactionHash?: string;
  explorerUrl?: string;
}

export interface VerificationReceipt {
  status: "ACCEPTED" | "FINALIZED" | "FAILED";
  transactionHash: string;
  decision?: VerificationDecision;
  confidence?: number;
  rationale?: string;
  plainText?: string;
  error?: string;
}
