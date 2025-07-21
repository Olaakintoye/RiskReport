import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { UserProfile, getUserProfile, updateUserProfile } from '../../services/settingsService';
import { UserProfileService, EnhancedUserProfile } from '../../services/userProfileService';
import { useAuth } from '../../hooks/use-auth';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EnhancedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');

  useEffect(() => {
    if (visible) {
      loadProfile();
    }
  }, [visible]);

  const loadProfile = async () => {
    try {
      const enhancedProfile = await UserProfileService.getCurrentUserProfile();
      setProfile(enhancedProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    if (!profile.full_name?.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!profile.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    setSaving(true);
    try {
      const result = await UserProfileService.updateProfile({
        full_name: profile.full_name,
        username: profile.username,
        email: profile.email,
      });
      
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof EnhancedUserProfile, value: string | null) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleChangeProfileImage = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => console.log('Take photo') },
        { text: 'Choose from Library', onPress: () => console.log('Choose from library') },
        { text: 'Remove Photo', style: 'destructive', onPress: () => updateField('avatar_url', null) },
      ]
    );
  };

  if (loading || !profile) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Profile Image */}
          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.imageContainer} onPress={handleChangeProfileImage}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <MaterialCommunityIcons name="account" size={48} color="#94a3b8" />
                </View>
              )}
              <View style={styles.imageOverlay}>
                <MaterialCommunityIcons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.imageHint}>Tap to change profile picture</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={profile?.full_name || ''}
                onChangeText={(value) => updateField('full_name', value)}
                placeholder="Enter your full name"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={[styles.textInput, usernameError ? styles.textInputError : null]}
                value={profile?.username || ''}
                onChangeText={(value) => {
                  updateField('username', value);
                  setUsernameError('');
                }}
                placeholder="Enter your username"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : (
                <Text style={styles.inputHint}>
                  3-50 characters, letters, numbers, and underscores only
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={profile.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.inputHint}>
                This email will be used for notifications and reports
              </Text>
            </View>

            {/* Account Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Information</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>User ID</Text>
                <Text style={styles.infoValue}>{profile.id}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Type</Text>
                <Text style={styles.infoValue}>Standard</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>January 2024</Text>
              </View>
            </View>

            {/* Security Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Security</Text>
              
              <TouchableOpacity style={styles.actionButton}>
                <MaterialCommunityIcons name="lock-reset" size={20} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Change Password</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#10b981" />
                <Text style={styles.actionButtonText}>Two-Factor Authentication</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Data Management */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data Management</Text>
              
              <TouchableOpacity style={styles.actionButton}>
                <MaterialCommunityIcons name="download" size={20} color="#8b5cf6" />
                <Text style={styles.actionButtonText}>Export My Data</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, styles.dangerButton]}>
                <MaterialCommunityIcons name="delete-forever" size={20} color="#ef4444" />
                <Text style={[styles.actionButtonText, styles.dangerText]}>Delete Account</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  cancelButton: {
    fontSize: 16,
    color: '#64748b',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  saveButtonDisabled: {
    color: '#94a3b8',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  imageHint: {
    fontSize: 14,
    color: '#64748b',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
    marginLeft: 12,
  },
  dangerButton: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#ef4444',
  },
  textInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
});

export default ProfileEditModal; 