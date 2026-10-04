# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from genlayer import *

ERROR_EXPECTED = "[EXPECTED]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM = "[LLM_ERROR]"

VALID_DECISIONS = {"APPROVED", "REJECTED", "INCONCLUSIVE"}


@allow_storage
@dataclass
class VerificationRecord:
    verification_id: str
    requester: Address
    question_hash: str
    evidence_hash: str
    question_title: str
    status: str
    decision: str
    confidence: u256
    rationale: str
    created_at: str
    finalized_at: str


class GenChatVerifier(gl.Contract):
    owner: Address
    verification_count: u256
    verifications: TreeMap[str, VerificationRecord]
    verification_ids: DynArray[str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.verification_count = u256(0)

    @gl.public.write
    def request_verification(
        self,
        verification_id: str,
        question_title: str,
        question_hash: str,
        evidence_hash: str,
        context_summary: str,
        criteria: str,
        created_at: str,
    ) -> str:
        """
        Submits an important question/decision for independent GenLayer AI validator consensus.
        The validators independently evaluate the question against the factual evidence summary
        and criteria to determine whether the claim/action is APPROVED, REJECTED, or INCONCLUSIVE.
        """
        clean_id = verification_id.strip() if verification_id else ""
        if not clean_id:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} verification_id cannot be empty")

        if clean_id in self.verifications:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} verification_id already exists")

        if not question_hash or not evidence_hash:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} question_hash and evidence_hash are required")

        if not context_summary or not criteria:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} context_summary and criteria are required")

        sanitized_title = question_title.strip()[:200] if question_title else "GenChat Verification"

        def evaluate():
            prompt = f"""You are an independent validator verifying a critical query or claim for GenChat.
Evaluate the question using the provided context summary and verification criteria.

QUESTION:
{sanitized_title}

EVIDENCE & CONTEXT SUMMARY:
{context_summary}

VERIFICATION CRITERIA:
{criteria}

REQUIREMENTS:
1. Examine if the evidence clearly and unambiguously satisfies the verification criteria.
2. If evidence strongly supports the proposition, choose "APPROVED".
3. If evidence clearly contradicts the proposition, choose "REJECTED".
4. If evidence is ambiguous, missing key facts, or insufficient, choose "INCONCLUSIVE".
5. Provide a confidence score between 0 and 100.
6. Provide a concise, objective rationale (max 2 sentences).

Respond ONLY with a JSON object matching this schema:
{{
  "decision": "APPROVED" | "REJECTED" | "INCONCLUSIVE",
  "confidence": <integer between 0 and 100>,
  "rationale": "<concise explanation>"
}}"""
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(res, dict):
                raise gl.vm.UserError(f"{ERROR_LLM} Invalid validator response format")

            decision = str(res.get("decision", "")).strip().upper()
            if decision not in VALID_DECISIONS:
                decision = "INCONCLUSIVE"

            try:
                conf_val = int(res.get("confidence", 50))
                confidence = max(0, min(100, conf_val))
            except Exception:
                confidence = 50

            rationale = str(res.get("rationale", "Validator evaluation completed.")).strip()[:500]

            return {
                "decision": decision,
                "confidence": confidence,
                "rationale": rationale,
            }

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                # Deterministic handling: Leader failure
                return False

            validator_result = evaluate()
            leader_data = leaders_res.calldata

            leader_decision = leader_data.get("decision")
            val_decision = validator_result.get("decision")

            # Consensus Rule 1: The core decision MUST agree
            if leader_decision != val_decision:
                return False

            # Consensus Rule 2: If approved or rejected, confidence tolerance within 35%
            leader_conf = leader_data.get("confidence", 50)
            val_conf = validator_result.get("confidence", 50)
            if abs(leader_conf - val_conf) > 35:
                return False

            return True

        evaluation_result = gl.vm.run_nondet_unsafe(evaluate, validator_fn)

        final_decision = evaluation_result["decision"]
        final_confidence = u256(int(evaluation_result["confidence"]))
        final_rationale = evaluation_result["rationale"]

        record = VerificationRecord(
            verification_id=clean_id,
            requester=gl.message.sender_address,
            question_hash=question_hash,
            evidence_hash=evidence_hash,
            question_title=sanitized_title,
            status="CONSENSUS",
            decision=final_decision,
            confidence=final_confidence,
            rationale=final_rationale,
            created_at=created_at or "",
            finalized_at=created_at or "",
        )

        self.verifications[clean_id] = record
        self.verification_ids.append(clean_id)
        self.verification_count = u256(int(self.verification_count) + 1)

        return final_decision

    @gl.public.view
    def get_verification(self, verification_id: str) -> dict:
        """
        Retrieves a verified record by ID.
        """
        if verification_id not in self.verifications:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Verification not found")

        record = self.verifications[verification_id]
        return {
            "verification_id": record.verification_id,
            "requester": str(record.requester),
            "question_hash": record.question_hash,
            "evidence_hash": record.evidence_hash,
            "question_title": record.question_title,
            "status": record.status,
            "decision": record.decision,
            "confidence": int(record.confidence),
            "rationale": record.rationale,
            "created_at": record.created_at,
            "finalized_at": record.finalized_at,
        }

    @gl.public.view
    def get_verification_count(self) -> int:
        return int(self.verification_count)

    @gl.public.view
    def list_verifications(self, offset: int, limit: int) -> list:
        total = int(self.verification_count)
        if offset < 0 or offset >= total:
            return []

        end = min(total, offset + limit)
        results = []
        for i in range(offset, end):
            vid = self.verification_ids[i]
            rec = self.verifications[vid]
            results.append({
                "verification_id": rec.verification_id,
                "requester": str(rec.requester),
                "question_hash": rec.question_hash,
                "evidence_hash": rec.evidence_hash,
                "question_title": rec.question_title,
                "status": rec.status,
                "decision": rec.decision,
                "confidence": int(rec.confidence),
                "rationale": rec.rationale,
                "created_at": rec.created_at,
                "finalized_at": rec.finalized_at,
            })
        return results
