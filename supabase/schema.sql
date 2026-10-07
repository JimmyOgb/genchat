-- GenChat Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Enables secure, authenticated conversation persistence and verification tracking with verifiable evidence path.

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    mode TEXT NOT NULL DEFAULT 'fast' CHECK (mode IN ('fast', 'research', 'verified')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user conversation listings ordered by update time
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
    ON public.conversations(user_id, updated_at DESC);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching conversation message history chronologically
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
    ON public.messages(conversation_id, created_at ASC);

-- 4. Verifications Table (On-chain reference tracking with evidence provenance)
CREATE TABLE IF NOT EXISTS public.verifications (
    id TEXT PRIMARY KEY, -- Unique verification ID matching on-chain ID
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_hash TEXT,
    question_title TEXT NOT NULL,
    question_hash TEXT NOT NULL,
    expected_evidence_hash TEXT NOT NULL,
    actual_evidence_hash TEXT,
    source_urls JSONB DEFAULT '[]'::jsonb,
    evidence_verified BOOLEAN DEFAULT FALSE,
    user_context_summary TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'ADJUDICATING', 'CONSENSUS', 'FAILED')),
    decision TEXT NOT NULL DEFAULT 'PENDING' CHECK (decision IN ('PENDING', 'APPROVED', 'REJECTED', 'INCONCLUSIVE')),
    confidence INTEGER DEFAULT 0,
    rationale TEXT,
    explorer_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_verifications_user 
    ON public.verifications(user_id, created_at DESC);

-- 5. Auto-update updated_at Trigger for Conversations
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON public.conversations;
CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: Conversations (Users can only access their own conversations)
CREATE POLICY "Users can select their own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
    ON public.conversations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
    ON public.conversations FOR DELETE
    USING (auth.uid() = user_id);

-- 8. RLS Policies: Messages (Users can only access messages in their conversations)
CREATE POLICY "Users can select messages of their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages into their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages of their conversations"
    ON public.messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    );

-- 9. RLS Policies: Verifications
CREATE POLICY "Users can select their own verifications"
    ON public.verifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verifications"
    ON public.verifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verifications"
    ON public.verifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
