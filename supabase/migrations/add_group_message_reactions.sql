-- Add reactions column to group_messages table
-- This allows emoji reactions on group chat messages (both from AI and user)

ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- Reactions format: { "❤️": ["user", "character_id"], "😂": ["character_id"] }
-- Key = emoji, Value = array of who reacted (either "user" or character IDs)
