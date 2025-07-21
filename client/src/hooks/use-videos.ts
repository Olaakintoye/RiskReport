import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import { AVPlaybackStatus } from 'expo-av';

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
  user_name?: string;
  engagement_score?: number;
  random_score?: number;
  duration?: number;
}

// Track which videos have been viewed by the current user (in-memory store)
const viewedVideos: Record<string, boolean> = {};

// Track video progress for the 20% threshold
const videoProgressMap: Record<string, number> = {};

// Overload signatures for the useVideos hook
export function useVideos(): {
  videos: Video[];
  loading: boolean;
  error: Error | null;
  trackVideoProgress: (status: AVPlaybackStatus, videoId: string) => void;
  toggleVideoLike: (videoId: string) => Promise<void>;
  refreshVideos: () => void;
  shuffleFeed: () => void;
};
export function useVideos(userId: string | null): {
  videos: Video[];
  loading: boolean;
  error: Error | null;
  trackVideoProgress: (status: AVPlaybackStatus, videoId: string) => void;
  toggleVideoLike: (videoId: string) => Promise<void>;
  refreshVideos: () => void;
  shuffleFeed: () => void;
};

// Implementation
export function useVideos(userId?: string | null) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const [randomSeed, setRandomSeed] = useState<number>(() => Math.random());

  // Refresh random seed every 15 minutes for a different ordering
  useEffect(() => {
    const interval = setInterval(() => {
      setRandomSeed(Math.random());
    }, 15 * 60 * 1000); // 15 minutes
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [user, randomSeed, userId]); // Re-fetch when random seed changes or userId changes

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Base query
      let query = supabase.from('videos').select('*');
      
      // If userId is provided, filter by that user
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data) {
        // Create a map of user IDs to fetch profile data
        const userIds = [...new Set(data.map(video => video.user_id))];
        let userNamesMap: Record<string, string> = {};
        
        // If we have user IDs, fetch their profiles
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
            
          if (!profilesError && profilesData) {
            // Create a map of user IDs to full names
            userNamesMap = profilesData.reduce((acc, profile) => {
              // Map 'full_name' from database to user_name for videos display
              acc[profile.id] = profile.full_name || 'User';
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        // Transform data to include user_name from profiles
        const processedVideos = data.map(video => ({
          ...video,
          // Use profile full_name if available, otherwise use a default
          user_name: userNamesMap[video.user_id] || 'User',
          views: video.views || 0,
          likes: video.likes || 0
        }));

        // If we're not filtering by user ID, apply recommendation algorithm
        // Otherwise, just return the user's videos in chronological order
        const finalVideos = userId 
          ? processedVideos 
          : applyRecommendationAlgorithm(processedVideos, user?.id, randomSeed);
        
        setVideos(finalVideos);
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch videos'));
    } finally {
      setLoading(false);
    }
  };

  // Instagram-like recommendation algorithm with increased randomness
  const applyRecommendationAlgorithm = (videos: Video[], currentUserId?: string, seed: number = Math.random()): Video[] => {
    if (!videos || videos.length === 0) return [];

    // Pseudorandom number generator with seed for consistent randomness
    const seededRandom = (max: number, min: number = 0) => {
      const x = Math.sin(seed++) * 10000;
      const rand = x - Math.floor(x);
      return Math.floor(rand * (max - min) + min);
    };

    // Step 1: Calculate engagement score and add random factor for each video
    const videosWithScores = videos.map(video => {
      // Engagement score formula (similar to Instagram's algorithm)
      // - Recent content gets higher score
      // - Higher views and likes get higher score
      // - Content from users the current user has engaged with gets higher score
      
      // Calculate recency score (0-1) - newer content gets higher score
      const ageInDays = (new Date().getTime() - new Date(video.created_at).getTime()) / (1000 * 3600 * 24);
      const recencyScore = Math.max(0, 1 - (ageInDays / 30)); // Content older than 30 days gets minimal recency score
      
      // Calculate popularity score based on views and likes (0-1)
      const viewsScore = Math.min(1, video.views / 1000); // Cap at 1000 views
      const likesScore = Math.min(1, video.likes / 100);  // Cap at 100 likes
      
      // Add a random factor (0-0.5) - introducing significant randomness
      const randomFactor = Math.random() * 0.5;
      
      // Combine scores with different weights, now including randomness
      const engagementScore = (
        recencyScore * 0.35 +    // Recency is important (35%)
        viewsScore * 0.2 +       // Views matter (20%)
        likesScore * 0.2 +       // Likes matter (20%)
        randomFactor * 0.25      // Random factor for discovery (25%)
      );

      // Also create a pure random score for occasional completely random ordering
      const randomScore = Math.random();

      return {
        ...video,
        engagement_score: engagementScore,
        random_score: randomScore
      };
    });

    // Step 2: Determine if we should use a mostly random feed for this session (20% chance)
    const useRandomizedFeed = Math.random() < 0.2;
    
    // Apply appropriate sorting strategy
    let recommendedVideos: Video[];
    
    if (useRandomizedFeed) {
      // For randomized feed, use mostly random_score with a bit of engagement score influence
      recommendedVideos = [...videosWithScores].sort((a, b) => {
        // 80% random, 20% engagement
        const scoreA = (a.random_score || 0) * 0.8 + (a.engagement_score || 0) * 0.2;
        const scoreB = (b.random_score || 0) * 0.8 + (b.engagement_score || 0) * 0.2;
        return scoreB - scoreA;
      });
    } else {
      // For normal feed, use mostly engagement with some randomness
      recommendedVideos = [...videosWithScores].sort((a, b) => {
        return (b.engagement_score || 0) - (a.engagement_score || 0);
      });
      
      // Now add randomness by shuffling segments of the sorted list
      if (recommendedVideos.length > 5) {
        // Keep top 10% intact
        const topCount = Math.max(1, Math.floor(recommendedVideos.length * 0.1));
        const topVideos = recommendedVideos.slice(0, topCount);
        
        // Middle 40% is shuffled in groups
        const middleCount = Math.floor(recommendedVideos.length * 0.4);
        let middleVideos = recommendedVideos.slice(topCount, topCount + middleCount);
        
        // Split middle into groups and shuffle each group
        const groupSize = Math.max(2, Math.floor(middleVideos.length / 3));
        let shuffledMiddle: Video[] = [];
        
        for (let i = 0; i < middleVideos.length; i += groupSize) {
          const group = middleVideos.slice(i, i + groupSize);
          shuffledMiddle = [...shuffledMiddle, ...shuffleArray(group, seed)];
        }
        
        // Remaining 50% gets completely shuffled
        let remainingVideos = recommendedVideos.slice(topCount + middleCount);
        remainingVideos = shuffleArray(remainingVideos, seed);
        
        // Put it all back together
        recommendedVideos = [...topVideos, ...shuffledMiddle, ...remainingVideos];
      }
    }

    return recommendedVideos;
  };

  // Fisher-Yates shuffle with seed
  const shuffleArray = <T>(array: T[], seed: number = Math.random()): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor((Math.sin(seed++) * 10000) % (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Track video playback progress and only count a view when user watches 20% of the video
  // Also ensure each user only counts one view per video
  const trackVideoProgress = (status: AVPlaybackStatus, videoId: string) => {
    // Skip if not a valid user or video already viewed by this user
    if (!user || viewedVideos[`${user.id}-${videoId}`]) {
      return;
    }
    
    if (status.isLoaded) {
      const { durationMillis, positionMillis, isPlaying } = status;
      
      // Skip if we don't have duration info yet
      if (!durationMillis) return;
      
      // Calculate percentage watched
      const percentWatched = (positionMillis / durationMillis) * 100;
      
      // Store the maximum percentage watched for this video
      videoProgressMap[videoId] = Math.max(percentWatched, videoProgressMap[videoId] || 0);
      
      // Check if user has watched at least 20% of the video
      if (videoProgressMap[videoId] >= 20) {
        // Only increment view if this is the first time this user has watched 20% of this video
        if (!viewedVideos[`${user.id}-${videoId}`]) {
          incrementVideoView(videoId);
          
          // Mark this video as viewed by this user to prevent duplicate views
          viewedVideos[`${user.id}-${videoId}`] = true;
          
          console.log(`View counted for video ${videoId} - User watched ${videoProgressMap[videoId].toFixed(1)}%`);
        }
      }
    }
  };

  // Function to mark a video as viewed
  const incrementVideoView = async (videoId: string) => {
    // Skip if user is not logged in
    if (!user) return;
    
    try {
      // Get current views
      const { data: currentData } = await supabase
        .from('videos')
        .select('views')
        .eq('id', videoId)
        .single();

      const currentViews = currentData?.views || 0;
      
      // First check if this user has already viewed this video in the database
      const { data: existingView, error: viewCheckError } = await supabase
        .from('video_views')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .single();
      
      // If the user has already viewed this video, don't increment view count
      if (existingView) {
        console.log('User already viewed this video - not counting additional view');
        return;
      }
      
      // Record this view in the video_views table
      await supabase
        .from('video_views')
        .insert({
          video_id: videoId,
          user_id: user.id,
          created_at: new Date().toISOString()
        });
      
      // Update views count
      await supabase
        .from('videos')
        .update({ views: currentViews + 1 })
        .eq('id', videoId);

      // Update local state
      setVideos(prevVideos => 
        prevVideos.map(video => 
          video.id === videoId 
            ? { ...video, views: (video.views || 0) + 1 }
            : video
        )
      );
    } catch (err) {
      console.error('Error incrementing views:', err);
    }
  };

  // Function to like/unlike a video
  const toggleVideoLike = async (videoId: string) => {
    if (!user) return;
    
    try {
      // First check if the user has already liked this video
      const { data: existingLike, error: likeCheckError } = await supabase
        .from('likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .single();

      // If we couldn't check for an existing like, just fallback to incrementing
      if (likeCheckError && likeCheckError.code !== 'PGRST116') {
        // Get the current likes
        const { data: videoData } = await supabase
          .from('videos')
          .select('likes')
          .eq('id', videoId)
          .single();
          
        if (videoData) {
          // Simply increment likes count
          const newLikes = (videoData.likes || 0) + 1;
          
          await supabase
            .from('videos')
            .update({ likes: newLikes })
            .eq('id', videoId);
            
          // Update local state
          setVideos(prevVideos => 
            prevVideos.map(video => 
              video.id === videoId 
                ? { ...video, likes: newLikes }
                : video
            )
          );
        }
        
        return;
      }

      if (existingLike) {
        // Unlike - remove from likes table
        await supabase
          .from('likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);
          
        // Decrement like count
        const { data: currentData } = await supabase
          .from('videos')
          .select('likes')
          .eq('id', videoId)
          .single();
  
        const currentLikes = Math.max(0, (currentData?.likes || 1) - 1);
        
        await supabase
          .from('videos')
          .update({ likes: currentLikes })
          .eq('id', videoId);
          
        // Update local state
        setVideos(prevVideos => 
          prevVideos.map(video => 
            video.id === videoId 
              ? { ...video, likes: Math.max(0, (video.likes || 1) - 1) }
              : video
          )
        );
      } else {
        // Like - add to likes table
        await supabase
          .from('likes')
          .insert({
            video_id: videoId,
            user_id: user.id,
            created_at: new Date().toISOString()
          });
          
        // Increment like count
        const { data: currentData } = await supabase
          .from('videos')
          .select('likes')
          .eq('id', videoId)
          .single();
  
        const currentLikes = (currentData?.likes || 0) + 1;
        
        await supabase
          .from('videos')
          .update({ likes: currentLikes })
          .eq('id', videoId);
          
        // Update local state
        setVideos(prevVideos => 
          prevVideos.map(video => 
            video.id === videoId 
              ? { ...video, likes: (video.likes || 0) + 1 }
              : video
          )
        );
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Function to get a fresh random feed
  const shuffleFeed = () => {
    setRandomSeed(Math.random());
  };

  // Function to refresh videos
  const refreshVideos = () => {
    fetchVideos();
  };

  return { 
    videos, 
    loading, 
    error,
    trackVideoProgress,  // New function that replaces incrementVideoView
    toggleVideoLike, 
    refreshVideos,
    shuffleFeed
  };
} 