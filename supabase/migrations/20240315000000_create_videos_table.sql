-- Create videos table
CREATE TABLE videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
    duration INTEGER, -- in seconds
    size INTEGER, -- in bytes
    mime_type TEXT
);

-- Create indexes
CREATE INDEX videos_user_id_idx ON videos(user_id);
CREATE INDEX videos_created_at_idx ON videos(created_at DESC);

-- Create RLS policies
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Allow users to view all videos
CREATE POLICY "Allow public read access" ON videos
    FOR SELECT USING (true);

-- Allow users to insert their own videos
CREATE POLICY "Allow users to insert their own videos" ON videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own videos
CREATE POLICY "Allow users to update their own videos" ON videos
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own videos
CREATE POLICY "Allow users to delete their own videos" ON videos
    FOR DELETE USING (auth.uid() = user_id); 