-- Add image generation settings to characters table
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS image_model TEXT DEFAULT 'gemini-2.5-flash-image',
ADD COLUMN IF NOT EXISTS reference_image_url TEXT;

-- Comment for clarity
COMMENT ON COLUMN characters.image_model IS 'Model for image generation: gemini-2.5-flash-image or gemini-3-pro-image-preview';
COMMENT ON COLUMN characters.reference_image_url IS 'Reference image URL for consistent character appearance in generated images';
