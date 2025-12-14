-- Add model_override column to group_members table
-- This allows setting a different model for each character in a group
-- to balance rate limits across providers (Gemini, Cerebras, etc.)

ALTER TABLE group_members ADD COLUMN IF NOT EXISTS model_override TEXT DEFAULT NULL;

-- NULL means use the character's default model
-- A value overrides the model for this character in this group only
