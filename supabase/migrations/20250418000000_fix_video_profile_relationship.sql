-- Add explicit foreign key relationship between videos and profiles
ALTER TABLE videos
ADD CONSTRAINT fk_videos_profiles
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Create an index to improve join performance
CREATE INDEX IF NOT EXISTS videos_profiles_user_id ON videos(user_id);

COMMENT ON CONSTRAINT fk_videos_profiles ON videos IS 'Videos belong to a profile'; 