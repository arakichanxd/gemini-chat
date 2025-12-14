-- Add model column to characters table
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT 'gemini-2.5-flash';

-- Valid models: gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.0-flash, gemini-2.0-flash-lite
