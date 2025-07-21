-- Drop the existing RLS policy that restricts profile viewing
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Drop the existing update policy if it exists
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create a new policy that allows anyone to view any profile
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Create policy for updates
-- Users should still only be able to update their own profiles
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- The automatic profile creation on signup still needs to work
-- Supabase has a trigger for this in the migrations, it should be preserved 