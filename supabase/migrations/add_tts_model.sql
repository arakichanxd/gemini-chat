-- Add TTS model selection to characters table
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS tts_model TEXT DEFAULT 'gemini-2.5-flash-preview-tts';

COMMENT ON COLUMN characters.tts_model IS 'TTS model for voice generation: gemini-2.5-flash-preview-tts or gemini-2.5-pro-preview-tts';
