-- Create a new table to track video views by unique users
CREATE TABLE IF NOT EXISTS video_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Enforce unique constraint to ensure one view per user per video
  UNIQUE(video_id, user_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user_id ON video_views(user_id);

-- Add comment to explain the table purpose
COMMENT ON TABLE video_views IS 'Tracks video views by unique users. One record = one view by one user, regardless of how many times they watch.';
