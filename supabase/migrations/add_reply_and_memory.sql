-- Add Reply to Message feature
-- Add reply_to_id column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add reply_to_id column to group_messages table
ALTER TABLE group_messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES group_messages(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_reply_to_id ON group_messages(reply_to_id);

-- ============================================
-- Long-Term Character Memory Feature
-- ============================================

-- Create character_memories table
CREATE TABLE IF NOT EXISTS character_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL DEFAULT 'fact', -- 'fact', 'preference', 'event', 'relationship'
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient memory retrieval
CREATE INDEX IF NOT EXISTS idx_character_memories_character_id ON character_memories(character_id);
CREATE INDEX IF NOT EXISTS idx_character_memories_importance ON character_memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_character_memories_type ON character_memories(memory_type);

-- Enable RLS
ALTER TABLE character_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now - can be restricted later)
CREATE POLICY "Allow public read access to character_memories" 
  ON character_memories FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to character_memories" 
  ON character_memories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to character_memories" 
  ON character_memories FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to character_memories" 
  ON character_memories FOR DELETE USING (true);
