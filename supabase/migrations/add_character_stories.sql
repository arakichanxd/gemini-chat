-- Character Stories/Status Feature
-- Creates a table for WhatsApp-like status updates

CREATE TABLE IF NOT EXISTS character_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood TEXT DEFAULT 'neutral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  viewed BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_character_stories_character_id ON character_stories(character_id);
CREATE INDEX IF NOT EXISTS idx_character_stories_expires_at ON character_stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_character_stories_created_at ON character_stories(created_at DESC);

-- Enable RLS
ALTER TABLE character_stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now)
CREATE POLICY "Allow public read access to character_stories" 
  ON character_stories FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to character_stories" 
  ON character_stories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to character_stories" 
  ON character_stories FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to character_stories" 
  ON character_stories FOR DELETE USING (true);

-- Function to clean up expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM character_stories WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
