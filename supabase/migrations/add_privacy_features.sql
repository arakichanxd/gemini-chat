-- Add privacy and customization columns to characters table
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lock_pin TEXT,
ADD COLUMN IF NOT EXISTS notification_sound TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#00a884';

COMMENT ON COLUMN characters.is_locked IS 'Whether this chat is password protected';
COMMENT ON COLUMN characters.lock_pin IS 'Hashed PIN for locked chats';
COMMENT ON COLUMN characters.notification_sound IS 'Sound to play on new message';
COMMENT ON COLUMN characters.theme_color IS 'Custom theme color for chat bubbles';
