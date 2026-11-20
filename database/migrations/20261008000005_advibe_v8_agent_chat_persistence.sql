-- Advibe PostgreSQL Migration V8: Agent Chat Persistence & Pitch Deck Extraction
-- Version: 20261008000005_advibe_v8_agent_chat_persistence.sql
-- Description:
-- 1. Creates uploaded_decks table for tracking uploaded PDF/TXT decks and metadata.
-- 2. Creates chat_conversations table for persisting conversation sessions, steps, and extracted profiles.
-- 3. Creates chat_messages table for persisting user and assistant messages with attachments and provider telemetry.
-- 4. Enables Row Level Security (RLS) on all tables with current_user_id() enforcement.

-- 1. Uploaded Decks Table
CREATE TABLE IF NOT EXISTS public.uploaded_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size INT NOT NULL,
    storage_path TEXT,
    extracted_text_chars INT DEFAULT 0,
    status TEXT DEFAULT 'processed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.uploaded_decks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'uploaded_decks' 
        AND policyname = 'Users can view and manage own uploaded decks'
    ) THEN
        CREATE POLICY "Users can view and manage own uploaded decks"
            ON public.uploaded_decks
            USING (user_id = current_user_id())
            WITH CHECK (user_id = current_user_id());
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_uploaded_decks_user_id ON public.uploaded_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_decks_created_at ON public.uploaded_decks(created_at DESC);


-- 2. Chat Conversations Table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    step TEXT DEFAULT 'discover',
    extracted_profile JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_conversations' 
        AND policyname = 'Users can view and manage own chat conversations'
    ) THEN
        CREATE POLICY "Users can view and manage own chat conversations"
            ON public.chat_conversations
            USING (user_id = current_user_id())
            WITH CHECK (user_id = current_user_id());
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON public.chat_conversations(updated_at DESC);


-- 3. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '{}'::jsonb,
    provider_used TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_messages' 
        AND policyname = 'Users can view own messages via conversation'
    ) THEN
        CREATE POLICY "Users can view own messages via conversation"
            ON public.chat_messages
            USING (
                conversation_id IN (
                    SELECT id FROM public.chat_conversations WHERE user_id = current_user_id()
                )
            )
            WITH CHECK (
                conversation_id IN (
                    SELECT id FROM public.chat_conversations WHERE user_id = current_user_id()
                )
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at ASC);
