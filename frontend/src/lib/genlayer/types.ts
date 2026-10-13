export type VerificationStatus =
  | "IDLE"
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "WRONG_NETWORK"
  | "READY"
  | "AWAITING_WALLET"
  | "WALLET_SUBMITTED"
  | "PREPARING"
  | "SUBMITTING"
  | "SUBMITTED"
  | "PROCESSING"
  | "ADJUDICATING"
  | "CONSENSUS"
  | "FINALIZED"
  | "VERIFIED"
  | "REJECTED"
  | "INCONCLUSIVE"
  | "ERROR"
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
  expectedEvidenceHash: string;
  sourceUrls: string[];
  criteria: string;
  userContextSummary: string;
  createdAt: string;
}

export interface VerificationRecord {
  verificationId: string;
  requester: string;
  questionTitle: string;
  questionHash: string;
  expectedEvidenceHash: string;
  actualEvidenceHash: string;
  sourceUrls: string[];
  evidenceVerified: boolean;
  status: string;
  decision: VerificationDecision;
  confidence: number;
  rationale: string;
  userContextSummary?: string;
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
  evidenceVerified?: boolean;
  actualEvidenceHash?: string;
  plainText?: string;
  /** Full record as decoded from the contract's get_verification (never synthesized). */
  record?: VerificationRecord;
  error?: string;
}
