import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export interface EnhancedUserProfile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  investment_experience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferred_currency: string;
  timezone: string;
  notification_preferences: any;
  created_at: string;
  updated_at: string;
}

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ProfileAuditLog {
  id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

export class UserProfileService {
  /**
   * Get current user's profile
   */
  static async getCurrentUserProfile(): Promise<EnhancedUserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCurrentUserProfile:', error);
      return null;
    }
  }

  /**
   * Get user display name with fallback logic
   */
  static async getUserDisplayName(userId?: string): Promise<string> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 'User';
        targetUserId = user.id;
      }

      const { data } = await supabase
        .rpc('get_user_display_name', { user_id: targetUserId });

      return data || 'User';
    } catch (error) {
      console.error('Error getting display name:', error);
      return 'User';
    }
  }

  /**
   * Validate username before updating
   */
  static async validateUsername(username: string): Promise<UsernameValidationResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isValid: false, error: 'User not authenticated' };
      }

      // Client-side validation
      if (!username || username.length < 3 || username.length > 50) {
        return { isValid: false, error: 'Username must be between 3 and 50 characters' };
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
      }

      // Server-side validation
      const { data, error } = await supabase
        .rpc('validate_username', { 
          new_username: username, 
          user_id: user.id 
        });

      if (error) {
        console.error('Error validating username:', error);
        return { isValid: false, error: 'Error validating username' };
      }

      if (!data) {
        return { isValid: false, error: 'Username is already taken or invalid' };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error in validateUsername:', error);
      return { isValid: false, error: 'Validation failed' };
    }
  }

  /**
   * Update username safely
   */
  static async updateUsername(username: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate first
      const validation = await this.validateUsername(username);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const { data, error } = await supabase
        .rpc('update_username', { new_username: username });

      if (error) {
        console.error('Error updating username:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateUsername:', error);
      return { success: false, error: 'Failed to update username' };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: Partial<ProfileUpdate>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  /**
   * Get profile audit logs
   */
  static async getProfileAuditLogs(): Promise<ProfileAuditLog[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_profile_audit')
        .select('id, field_changed, old_value, new_value, changed_at')
        .eq('user_id', user.id)
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProfileAuditLogs:', error);
      return [];
    }
  }

  /**
   * Check if username is available
   */
  static async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows returned, username is available
        return true;
      }

      // Username exists
      return false;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  }

  /**
   * Generate username suggestions
   */
  static async generateUsernameSuggestions(baseName: string): Promise<string[]> {
    const suggestions: string[] = [];
    const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (cleanBase.length < 3) {
      return suggestions;
    }

    // Try base name
    if (await this.isUsernameAvailable(cleanBase)) {
      suggestions.push(cleanBase);
    }

    // Try with numbers
    for (let i = 1; i <= 99; i++) {
      const suggestion = `${cleanBase}${i}`;
      if (await this.isUsernameAvailable(suggestion)) {
        suggestions.push(suggestion);
        if (suggestions.length >= 5) break;
      }
    }

    // Try with underscores
    const withUnderscore = `${cleanBase}_user`;
    if (await this.isUsernameAvailable(withUnderscore)) {
      suggestions.push(withUnderscore);
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Update avatar URL
   */
  static async updateAvatar(avatarUrl: string): Promise<{ success: boolean; error?: string }> {
    return this.updateProfile({ avatar_url: avatarUrl });
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(preferences: any): Promise<{ success: boolean; error?: string }> {
    return this.updateProfile({ notification_preferences: preferences });
  }

  /**
   * Update user preferences (risk tolerance, experience, etc.)
   */
  static async updateUserPreferences(preferences: {
    risk_tolerance?: 'conservative' | 'moderate' | 'aggressive';
    investment_experience?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    preferred_currency?: string;
    timezone?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.updateProfile(preferences);
  }
}

export default UserProfileService; 