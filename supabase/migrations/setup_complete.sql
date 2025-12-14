-- ============================================
-- COMPLETE SUPABASE SETUP FOR GEMINI CHAT APP
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

-- Characters table for AI personas
CREATE TABLE IF NOT EXISTS public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful assistant.',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice')),
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Characters policies (public access)
DROP POLICY IF EXISTS "Allow public read access to characters" ON public.characters;
CREATE POLICY "Allow public read access to characters" ON public.characters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to characters" ON public.characters;
CREATE POLICY "Allow public insert access to characters" ON public.characters FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to characters" ON public.characters;
CREATE POLICY "Allow public update access to characters" ON public.characters FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete access to characters" ON public.characters;
CREATE POLICY "Allow public delete access to characters" ON public.characters FOR DELETE USING (true);

-- Conversations policies (public access)
DROP POLICY IF EXISTS "Allow public read access to conversations" ON public.conversations;
CREATE POLICY "Allow public read access to conversations" ON public.conversations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to conversations" ON public.conversations;
CREATE POLICY "Allow public insert access to conversations" ON public.conversations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to conversations" ON public.conversations;
CREATE POLICY "Allow public update access to conversations" ON public.conversations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete access to conversations" ON public.conversations;
CREATE POLICY "Allow public delete access to conversations" ON public.conversations FOR DELETE USING (true);

-- Messages policies (public access)
DROP POLICY IF EXISTS "Allow public read access to messages" ON public.messages;
CREATE POLICY "Allow public read access to messages" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to messages" ON public.messages;
CREATE POLICY "Allow public insert access to messages" ON public.messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to messages" ON public.messages;
CREATE POLICY "Allow public update access to messages" ON public.messages FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete access to messages" ON public.messages;
CREATE POLICY "Allow public delete access to messages" ON public.messages FOR DELETE USING (true);

-- ============================================
-- 3. REALTIME
-- ============================================

-- Enable realtime for messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- ============================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for characters table
DROP TRIGGER IF EXISTS update_characters_updated_at ON public.characters;
CREATE TRIGGER update_characters_updated_at
BEFORE UPDATE ON public.characters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. STORAGE BUCKETS
-- ============================================

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create chat-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- 6. STORAGE POLICIES
-- ============================================

-- Avatars bucket policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
CREATE POLICY "Anyone can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;
CREATE POLICY "Anyone can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');

-- Chat images bucket policies
DROP POLICY IF EXISTS "Chat images are publicly accessible" ON storage.objects;
CREATE POLICY "Chat images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Anyone can upload chat images" ON storage.objects;
CREATE POLICY "Anyone can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Anyone can update chat images" ON storage.objects;
CREATE POLICY "Anyone can update chat images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Anyone can delete chat images" ON storage.objects;
CREATE POLICY "Anyone can delete chat images"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-images');

-- ============================================
-- 7. DEFAULT CHARACTERS (OPTIONAL)
-- ============================================

-- Insert default characters if they don't exist
INSERT INTO public.characters (name, system_prompt, description)
VALUES 
  ('Kiaraa', 'You are Kiaraa, a friendly and flirty AI companion who speaks in casual Hinglish. You are warm, playful, and love to have fun conversations.', 'Your flirty Hinglish companion'),
  ('Rehaaaa', 'You are Rehaaaa, a bold and spicy AI companion who speaks in Hinglish. You are confident, sassy, and always keep things interesting.', 'Your spicy Hinglish friend')
ON CONFLICT DO NOTHING;

-- ============================================
-- DONE! Your database is now set up.
-- ============================================
