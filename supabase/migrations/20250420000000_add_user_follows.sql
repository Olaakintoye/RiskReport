-- Create user follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Enforce unique constraint to prevent duplicate follows
  UNIQUE(follower_id, following_id)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- Add composite index for faster lookups when checking if a user follows another
CREATE INDEX IF NOT EXISTS idx_follows_relationship ON follows(follower_id, following_id);

-- Add comment to explain the table purpose
COMMENT ON TABLE follows IS 'Tracks user follows. One record = one user following another user.';

-- Enable Row Level Security
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can see who they follow and who follows them
CREATE POLICY "Users can view their own follow relationships"
ON follows FOR SELECT
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Users can only create follows where they are the follower
CREATE POLICY "Users can follow others"
ON follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can only delete follows where they are the follower
CREATE POLICY "Users can unfollow others"
ON follows FOR DELETE
USING (auth.uid() = follower_id);

-- Create functions to count followers and following

-- Function to count followers for a user
CREATE OR REPLACE FUNCTION get_follower_count(user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM follows
  WHERE following_id = user_id;
$$;

-- Function to count following for a user
CREATE OR REPLACE FUNCTION get_following_count(user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM follows
  WHERE follower_id = user_id;
$$;

-- Add followers_count and following_count to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Create function to update follower counts when follow/unfollow happens
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For inserts, increment counts
  IF (TG_OP = 'INSERT') THEN
    -- Update follower count for the user being followed
    UPDATE profiles
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;
    
    -- Update following count for the follower
    UPDATE profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  END IF;
  
  -- For deletes, decrement counts
  IF (TG_OP = 'DELETE') THEN
    -- Update follower count for the user being unfollowed
    UPDATE profiles
    SET followers_count = followers_count - 1
    WHERE id = OLD.following_id;
    
    -- Update following count for the unfollower
    UPDATE profiles
    SET following_count = following_count - 1
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers to update counts
CREATE TRIGGER on_follow_changed
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Function to check if a user follows another user
CREATE OR REPLACE FUNCTION user_follows(follower_id UUID, following_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM follows
    WHERE follower_id = $1 AND following_id = $2
  );
$$; 