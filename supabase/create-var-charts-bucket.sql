-- Create Supabase Storage bucket for VaR charts
-- Run this in Supabase SQL Editor or Dashboard

-- Create the bucket (if using SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('var-charts', 'var-charts', true)
ON CONFLICT (id) DO NOTHING;

-- Set RLS policies for var-charts bucket

-- Policy: Users can upload charts to their own folder
CREATE POLICY "Users can upload VaR charts to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'var-charts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view VaR charts (public bucket)
CREATE POLICY "Anyone can view VaR charts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'var-charts');

-- Policy: Users can update their own charts
CREATE POLICY "Users can update their own charts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'var-charts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own charts
CREATE POLICY "Users can delete their own charts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'var-charts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

