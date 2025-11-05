-- Create Supabase Storage bucket for VaR charts
-- Run this in Supabase SQL Editor or Dashboard

-- Create the bucket (if using SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('var-charts', 'var-charts', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload VaR charts to their own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view VaR charts" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view charts for their portfolios" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own charts" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own charts" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can upload charts" ON storage.objects;
END $$;

-- Set RLS policies for var-charts bucket

-- Policy: Users can upload charts to their own folder
CREATE POLICY "Users can upload VaR charts to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'var-charts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Service role can upload charts (for backend API)
CREATE POLICY "Service role can upload charts"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'var-charts');

-- Policy: Anyone can view VaR charts (public bucket for easy access)
CREATE POLICY "Anyone can view VaR charts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'var-charts');

-- Policy: Users can view charts for portfolios they own
-- This provides additional security beyond the public policy
CREATE POLICY "Users can view charts for their portfolios"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'var-charts' AND
  (
    -- User owns the folder (user_id is first part of path)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Or user owns a portfolio that matches the chart path
    EXISTS (
      SELECT 1 FROM portfolios p
      WHERE p.user_id = auth.uid()
      AND (storage.foldername(name))[2] = p.id::text
    )
  )
);

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

