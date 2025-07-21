# Fixing Supabase RLS Policies for Profile Searching

The current issue is that users can only search for their own profile due to restrictive Row-Level Security (RLS) policies in Supabase. This prevents the Explore page from showing other users in search results.

## The SQL Fix

Run the following SQL in the Supabase SQL Editor (https://app.supabase.com > Project > SQL Editor):

```sql
-- This SQL script fixes the RLS policies to allow all users to search for any profile
-- while maintaining security for profile updates

-- Enable RLS on the profiles table (in case it's not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies for the profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create a policy that allows anyone to view any profile (needed for search)
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Create a policy that restricts profile updates to the owner only
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create a policy that allows users to insert their own profile only
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

## Why This Fix is Important

1. **Search Functionality**: Without proper RLS policies, users can only see their own profile in search results, making the social features of the app unusable.

2. **User Experience**: Users expect to be able to find and follow other users in a social app.

3. **Security Balance**: This fix allows read access to all profiles while still protecting sensitive operations (updates, inserts) with appropriate restrictions.

## Alternative Solutions

If you cannot modify the RLS policies:

1. In our app code, we've implemented a fallback mechanism that shows demo users in search results when database queries fail.

2. You could also create a separate, public table containing just the searchable profile information that doesn't have restrictive RLS policies. 