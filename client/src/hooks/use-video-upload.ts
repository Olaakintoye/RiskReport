import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode, VideoProps } from 'expo-av';
import { supabase } from '../lib/supabase';
import { useAuth } from './use-auth';

interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface VideoAsset {
  uri: string;
  width: number;
  height: number;
  duration: number;
  size: number;
  mimeType: string;
}

export const useVideoUpload = () => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    status: 'completed',
  });
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<{ full_name: string | null } | null>(null);

  // Fetch user profile data
  const fetchProfileData = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
        
      if (!error && data) {
        setProfileData(data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile data:', error);
      return null;
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60, // 1 minute max
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }
      return null;
    } catch (error) {
      console.error('Error picking video:', error);
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: 'Failed to pick video',
      });
      return null;
    }
  };

  const uploadVideo = async (
    videoUri: string,
    title: string,
    description?: string
  ) => {
    if (!user) {
      throw new Error('User must be authenticated to upload videos');
    }

    try {
      setUploadProgress({ progress: 0, status: 'uploading' });
      
      // Fetch profile data if not already loaded
      if (!profileData) {
        await fetchProfileData();
      }

      // Create a unique file name using timestamp and user ID
      const timestamp = Date.now();
      const videoFileName = `${user.id}/${timestamp}-video.mp4`;
      
      // Upload video to storage
      const { data: videoData, error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoFileName, {
          uri: videoUri,
          type: 'video/mp4',
        } as any);

      if (videoError) throw videoError;

      // Get public URL for the uploaded video
      const { data: publicUrlData } = await supabase.storage
        .from('videos')
        .getPublicUrl(videoFileName);
        
      const publicUrl = publicUrlData?.publicUrl || '';

      // Update progress
      setUploadProgress({ progress: 50, status: 'uploading' });

      // Create video record in database with better metadata
      const { data: videoRecord, error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title,
          description,
          video_url: publicUrl || videoData.path, // Use public URL if available
          thumbnail_url: null,
          duration: 0, // Duration will be updated when video is played
          size: 0, // Size is not available in AVPlaybackStatus
          mime_type: 'video/mp4',
          status: 'ready',
          created_at: new Date().toISOString(), // Explicitly set creation time
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress({ progress: 100, status: 'completed' });
      return videoRecord;
    } catch (error) {
      console.error('Error uploading video:', error);
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to upload video',
      });
      throw error;
    }
  };

  const uploadVideoFromUrl = async (
    videoUrl: string,
    title: string,
    description?: string
  ) => {
    if (!user) {
      throw new Error('User must be authenticated to upload videos');
    }

    if (!videoUrl || !videoUrl.trim() || !isValidVideoUrl(videoUrl)) {
      throw new Error('Please enter a valid video URL');
    }

    try {
      setUploadProgress({ progress: 0, status: 'uploading' });
      
      // Fetch profile data if not already loaded
      if (!profileData) {
        await fetchProfileData();
      }

      // Skip actual file upload since we're just storing the URL
      setUploadProgress({ progress: 50, status: 'uploading' });

      // Create video record in database with better metadata
      const { data: videoRecord, error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title,
          description,
          video_url: videoUrl, // Store the full URL (external URLs start with http/https)
          thumbnail_url: null,
          duration: 0,
          size: 0,
          mime_type: determineVideoMimeType(videoUrl),
          status: 'ready',
          created_at: new Date().toISOString(), // Explicitly set creation time
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress({ progress: 100, status: 'completed' });
      return videoRecord;
    } catch (error) {
      console.error('Error adding video from URL:', error);
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to add video from URL',
      });
      throw error;
    }
  };

  // Determine MIME type based on URL
  const determineVideoMimeType = (url: string): string => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'video/youtube';
    } else if (url.includes('vimeo.com')) {
      return 'video/vimeo';
    } else if (url.includes('dailymotion.com')) {
      return 'video/dailymotion';
    } else if (url.includes('facebook.com')) {
      return 'video/facebook';
    } else if (url.match(/\.(mp4)(\?.*)?$/i)) {
      return 'video/mp4';
    } else if (url.match(/\.(webm)(\?.*)?$/i)) {
      return 'video/webm';
    } else if (url.match(/\.(mov)(\?.*)?$/i)) {
      return 'video/quicktime';
    }
    return 'video/mp4'; // Default fallback
  };

  // Basic validation for video URLs
  const isValidVideoUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    
    // Must start with http:// or https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    
    // Check if URL is from common video platforms
    const videoPatterns = [
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i,  // YouTube
      /^https?:\/\/(www\.)?(vimeo\.com)\/.+/i,              // Vimeo
      /^https?:\/\/(www\.)?(dailymotion\.com)\/.+/i,        // Dailymotion
      /^https?:\/\/(www\.)?(facebook\.com)\/.+\/videos\/.+/i, // Facebook
      /^https?:\/\/.*\.(mp4|mov|webm)(\?.*)?$/i,  // Direct video file links
    ];
    
    return videoPatterns.some(pattern => pattern.test(url.trim()));
  };

  return {
    pickVideo,
    uploadVideo,
    uploadVideoFromUrl,
    isValidVideoUrl,
    uploadProgress,
    fetchProfileData, // Export this so components can use it
    profileData, // Export the profile data for components to use
  };
}; 