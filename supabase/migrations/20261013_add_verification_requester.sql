-- Migration: add `requester` to public.verifications
-- Date: 2026-10-13
--
-- The current GenChatVerifier contract returns `requester` (the submitting wallet address)
-- in every record from get_verification. Earlier GenChat builds did not persist it.
--
-- SAFE / ADDITIVE:
--   * Adds one nullable column; no data is rewritten, dropped, or truncated.
--   * Existing rows keep requester = NULL (the contract value for older rows is not
--     fabricated). Re-read via get_verification if backfill is wanted.
--   * Idempotent: safe to run more than once.
--   * No CHECK constraint changes; contract `status` value "CONSENSUS" is already allowed.

ALTER TABLE public.verifications
    ADD COLUMN IF NOT EXISTS requester TEXT;

COMMENT ON COLUMN public.verifications.requester IS
    'Wallet address that submitted request_verification, as returned by the contract. NULL for rows created before this column existed.';
