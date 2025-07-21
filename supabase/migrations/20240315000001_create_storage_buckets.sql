-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('videos', 'videos', true),
    ('thumbnails', 'thumbnails', true);

-- Create storage policies for videos bucket
CREATE POLICY "Allow public read access to videos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'videos');

CREATE POLICY "Allow authenticated users to upload videos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'videos' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow users to update their own videos"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'videos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Allow users to delete their own videos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'videos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create storage policies for thumbnails bucket
CREATE POLICY "Allow public read access to thumbnails"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'thumbnails');

CREATE POLICY "Allow authenticated users to upload thumbnails"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'thumbnails' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow users to update their own thumbnails"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'thumbnails' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Allow users to delete their own thumbnails"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'thumbnails' AND
        auth.uid()::text = (storage.foldername(name))[1]
    ); 