import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './use-auth';

interface FollowUser {
  id: string;
  full_name: string | null;
  email: string;
  followers_count: number;
  following_count: number;
}

interface UseFollowsReturn {
  followers: FollowUser[];
  following: FollowUser[];
  loading: boolean;
  error: string | null;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  refreshFollows: () => Promise<void>;
  followersCount: number;
  followingCount: number;
}

export function useFollows(): UseFollowsReturn {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Set of user IDs that the current user is following (for faster lookups)
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  // Load followers and following
  const fetchFollows = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get followers (users who follow the current user)
      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles:follower_id (
            id,
            full_name,
            email,
            followers_count,
            following_count
          )
        `)
        .eq('following_id', user.id);
      
      if (followersError) throw followersError;
      
      // Get following (users that the current user follows)
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles:following_id (
            id,
            full_name,
            email,
            followers_count,
            following_count
          )
        `)
        .eq('follower_id', user.id);
      
      if (followingError) throw followingError;
      
      // Transform and set followers data
      const transformedFollowers = followersData
        .map(item => item.profiles as unknown as FollowUser)
        .filter(Boolean);
      
      setFollowers(transformedFollowers);
      setFollowersCount(transformedFollowers.length);
      
      // Transform and set following data
      const transformedFollowing = followingData
        .map(item => item.profiles as unknown as FollowUser)
        .filter(Boolean);
      
      setFollowing(transformedFollowing);
      setFollowingCount(transformedFollowing.length);
      
      // Create a set of user IDs that the current user is following for faster lookups
      const newFollowingSet = new Set(transformedFollowing.map(f => f.id));
      setFollowingSet(newFollowingSet);
    } catch (err) {
      console.error('Error fetching follows:', err);
      setError('Failed to load followers and following');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  
  // Follow a user
  const followUser = async (userId: string) => {
    if (!user?.id) {
      setError('You must be logged in to follow users');
      return;
    }
    
    if (user.id === userId) {
      setError('You cannot follow yourself');
      return;
    }
    
    try {
      const { error: followError } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId,
        });
      
      if (followError) {
        console.error('Error following user:', followError);
        throw followError;
      }
      
      // Refresh follows after following
      await fetchFollows();
    } catch (err) {
      console.error('Error in followUser:', err);
      setError('Failed to follow user');
    }
  };
  
  // Unfollow a user
  const unfollowUser = async (userId: string) => {
    if (!user?.id) {
      setError('You must be logged in to unfollow users');
      return;
    }
    
    try {
      const { error: unfollowError } = await supabase
        .from('follows')
        .delete()
        .match({
          follower_id: user.id,
          following_id: userId,
        });
      
      if (unfollowError) {
        console.error('Error unfollowing user:', unfollowError);
        throw unfollowError;
      }
      
      // Refresh follows after unfollowing
      await fetchFollows();
    } catch (err) {
      console.error('Error in unfollowUser:', err);
      setError('Failed to unfollow user');
    }
  };
  
  // Check if current user is following another user
  const isFollowing = useCallback((userId: string) => {
    return followingSet.has(userId);
  }, [followingSet]);
  
  // Initial fetch of follows when user changes
  useEffect(() => {
    if (user?.id) {
      fetchFollows();
    } else {
      // Reset data when user is logged out
      setFollowers([]);
      setFollowing([]);
      setFollowersCount(0);
      setFollowingCount(0);
      setFollowingSet(new Set());
    }
  }, [user?.id, fetchFollows]);
  
  return {
    followers,
    following,
    loading,
    error,
    followUser,
    unfollowUser,
    isFollowing,
    refreshFollows: fetchFollows,
    followersCount,
    followingCount,
  };
} 