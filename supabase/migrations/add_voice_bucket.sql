-- Create voice-messages storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access
CREATE POLICY "Public voice message read access" ON storage.objects
FOR SELECT USING (bucket_id = 'voice-messages');

-- Policy to allow authenticated upload (or public for now without auth)
CREATE POLICY "Allow voice message upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'voice-messages');
