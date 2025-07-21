import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  user_id: string;
  created_at: string;
  views: number;
  likes: number;
  duration?: number;
}

export function useUserVideos(userId: string | null) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0
  });

  useEffect(() => {
    if (userId) {
      fetchUserVideos(userId);
    }
  }, [userId]);

  const fetchUserVideos = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setVideos(data);
        
        // Calculate stats
        const totalVideos = data.length;
        const totalViews = data.reduce((sum, video) => sum + (video.views || 0), 0);
        const totalLikes = data.reduce((sum, video) => sum + (video.likes || 0), 0);
        
        setStats({
          totalVideos,
          totalViews,
          totalLikes
        });
      }
    } catch (err) {
      console.error('Error fetching user videos:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user videos'));
    } finally {
      setLoading(false);
    }
  };

  const refreshVideos = () => {
    if (userId) {
      fetchUserVideos(userId);
    }
  };

  return { 
    videos, 
    loading, 
    error, 
    stats,
    refreshVideos
  };
} 