-- Add read receipts and reactions support to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN messages.read_at IS 'Timestamp when message was read (for read receipts)';
COMMENT ON COLUMN messages.reactions IS 'JSON array of emoji reactions on this message';
