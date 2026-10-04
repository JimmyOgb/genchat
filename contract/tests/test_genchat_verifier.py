import json
import pytest

SAMPLE_QUESTION = "Should contractor Acme Corp be paid milestone 3 for API deployment?"
SAMPLE_QUESTION_HASH = "0x4a123f18b5b7b9268f7b76a66a1a18c94e09f5bc3e5c94293f9c6d482594a11b"
SAMPLE_EVIDENCE_HASH = "0x89b6c0032b8a0715d0deffc9b1f2b6e5114bc69f52f36d3bbdf29c294025178e"
SAMPLE_CONTEXT = "Acme Corp contract requires 99.9% uptime and Swagger docs. Logs confirm deployment passed on AWS on Oct 1st."
SAMPLE_CRITERIA = "Approve payment if production deployment and API documentation are verified."


@pytest.fixture(autouse=True)
def default_llm_mock(direct_vm):
    """Default mock for validator LLM prompt."""
    direct_vm.mock_llm(
        r".*independent validator verifying a critical query.*",
        json.dumps({
            "decision": "APPROVED",
            "confidence": 92,
            "rationale": "Logs and Swagger docs confirm milestone requirements have been completed."
        }),
    )


def test_contract_initialization(direct_vm, direct_deploy, direct_alice):
    """Test initial deployment and empty state."""
    direct_vm.sender = direct_alice
    verifier = direct_deploy("contract/GenChatVerifier.py")

    assert verifier.get_verification_count() == 0
    assert verifier.list_verifications(0, 10) == []


def test_successful_verification_approval(direct_vm, direct_deploy, direct_alice):
    """Test submitting a verification that achieves consensus approval."""
    direct_vm.sender = direct_alice
    verifier = direct_deploy("contract/GenChatVerifier.py")

    decision = verifier.request_verification(
        verification_id="v-001",
        question_title=SAMPLE_QUESTION,
        question_hash=SAMPLE_QUESTION_HASH,
        evidence_hash=SAMPLE_EVIDENCE_HASH,
        context_summary=SAMPLE_CONTEXT,
        criteria=SAMPLE_CRITERIA,
        created_at="2026-10-04T10:00:00Z",
    )

    assert decision == "APPROVED"
    assert verifier.get_verification_count() == 1

    record = verifier.get_verification("v-001")
    assert record["verification_id"] == "v-001"
    assert record["decision"] == "APPROVED"
    assert record["confidence"] == 92
    assert record["status"] == "CONSENSUS"
    assert record["question_hash"] == SAMPLE_QUESTION_HASH
    assert record["evidence_hash"] == SAMPLE_EVIDENCE_HASH
    assert "Swagger" in record["rationale"]


def test_inconclusive_verification_on_ambiguous_evidence(direct_vm, direct_deploy, direct_alice):
    """Test inconclusive handling when evidence is ambiguous or incomplete."""
    direct_vm.sender = direct_alice
    verifier = direct_deploy("contract/GenChatVerifier.py")

    direct_vm.mock_llm(
        r".*independent validator verifying a critical query.*",
        json.dumps({
            "decision": "INCONCLUSIVE",
            "confidence": 40,
            "rationale": "Evidence lacks AWS CloudWatch metric logs for required 99.9% uptime verification."
        }),
    )

    decision = verifier.request_verification(
        verification_id="v-002",
        question_title=SAMPLE_QUESTION,
        question_hash=SAMPLE_QUESTION_HASH,
        evidence_hash=SAMPLE_EVIDENCE_HASH,
        context_summary="Uptime logs were not attached.",
        criteria=SAMPLE_CRITERIA,
        created_at="2026-10-04T10:05:00Z",
    )

    assert decision == "INCONCLUSIVE"
    record = verifier.get_verification("v-002")
    assert record["decision"] == "INCONCLUSIVE"
    assert record["confidence"] == 40


def test_rejection_verification_when_criteria_violated(direct_vm, direct_deploy, direct_alice):
    """Test rejection outcome when evidence contradicts the claim."""
    direct_vm.sender = direct_alice
    verifier = direct_deploy("contract/GenChatVerifier.py")

    direct_vm.mock_llm(
        r".*independent validator verifying a critical query.*",
        json.dumps({
            "decision": "REJECTED",
            "confidence": 88,
            "rationale": "API deployment failed end-to-end tests with 404 on critical routes."
        }),
    )

    decision = verifier.request_verification(
        verification_id="v-003",
        question_title=SAMPLE_QUESTION,
        question_hash=SAMPLE_QUESTION_HASH,
        evidence_hash=SAMPLE_EVIDENCE_HASH,
        context_summary="E2E test suite failed with 14 errors.",
        criteria=SAMPLE_CRITERIA,
        created_at="2026-10-04T10:10:00Z",
    )

    assert decision == "REJECTED"
    record = verifier.get_verification("v-003")
    assert record["decision"] == "REJECTED"


def test_duplicate_verification_id_reverts(direct_vm, direct_deploy, direct_alice):
    """Ensure duplicate verification IDs are rejected."""
    direct_vm.sender = direct_alice
    verifier = direct_deploy("contract/GenChatVerifier.py")

    verifier.request_verification(
        verification_id="v-dup",
        question_title=SAMPLE_QUESTION,
        question_hash=SAMPLE_QUESTION_HASH,
        evidence_hash=SAMPLE_EVIDENCE_HASH,
        context_summary=SAMPLE_CONTEXT,
        criteria=SAMPLE_CRITERIA,
        created_at="2026-10-04T10:00:00Z",
    )

    with direct_vm.expect_revert("verification_id already exists"):
        verifier.request_verification(
            verification_id="v-dup",
            question_title="Another question",
            question_hash=SAMPLE_QUESTION_HASH,
            evidence_hash=SAMPLE_EVIDENCE_HASH,
            context_summary=SAMPLE_CONTEXT,
            criteria=SAMPLE_CRITERIA,
            created_at="2026-10-04T10:01:00Z",
        )


def test_missing_required_fields_revert(direct_vm, direct_deploy, direct_alice):
    """Verify input validation for empty verification_id or hashes."""
    direct_vm.sender = direct_alice
    verifier = direct_deploy("contract/GenChatVerifier.py")

    with direct_vm.expect_revert("verification_id cannot be empty"):
        verifier.request_verification(
            verification_id="",
            question_title="Test",
            question_hash=SAMPLE_QUESTION_HASH,
            evidence_hash=SAMPLE_EVIDENCE_HASH,
            context_summary=SAMPLE_CONTEXT,
            criteria=SAMPLE_CRITERIA,
            created_at="2026-10-04T10:00:00Z",
        )

    with direct_vm.expect_revert("question_hash and evidence_hash are required"):
        verifier.request_verification(
            verification_id="v-no-hash",
            question_title="Test",
            question_hash="",
            evidence_hash="",
            context_summary=SAMPLE_CONTEXT,
            criteria=SAMPLE_CRITERIA,
            created_at="2026-10-04T10:00:00Z",
        )


def test_get_nonexistent_verification_reverts(direct_vm, direct_deploy, direct_alice):
    """Attempting to read an unknown verification ID reverts."""
    direct_vm.sender = direct_alice
    verifier = direct_deploy("contract/GenChatVerifier.py")

    with direct_vm.expect_revert("Verification not found"):
        verifier.get_verification("non-existent-id")
