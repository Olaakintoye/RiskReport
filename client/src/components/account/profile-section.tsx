import { useQuery } from "@tanstack/react-query";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useToast } from "@/hooks/use-toast";

interface ProfileSectionProps {
  userId: number;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  isVerified: boolean;
}

export default function ProfileSection({ userId }: ProfileSectionProps) {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
  });
  
  const { toast } = useToast();
  
  const handleEditProfile = () => {
    toast({
      title: "Coming Soon",
      description: "Profile editing will be available in a future update.",
      variant: "default",
    });
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingHeader}>
          <View style={styles.loadingAvatar} />
          <View style={styles.loadingInfo}>
            <View style={styles.loadingName} />
            <View style={styles.loadingEmail} />
            <View style={styles.loadingStatus} />
          </View>
        </View>
        <View style={styles.loadingButton} />
      </View>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{user?.fullName || 'User'}</Text>
          <Text style={styles.email}>{user?.email || 'No email provided'}</Text>
          <View style={[styles.status, user?.isVerified ? styles.verified : styles.pending]}>
            <Text style={styles.statusText}>
              {user?.isVerified ? 'Verified' : 'Verification Pending'}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.editButton}
        onPress={handleEditProfile}
      >
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  status: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verified: {
    backgroundColor: '#10B981',
  },
  pending: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E5E5',
    marginRight: 16,
  },
  loadingInfo: {
    flex: 1,
  },
  loadingName: {
    height: 20,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    width: '50%',
    marginBottom: 8,
  },
  loadingEmail: {
    height: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    width: '75%',
    marginBottom: 8,
  },
  loadingStatus: {
    height: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    width: '25%',
  },
  loadingButton: {
    height: 40,
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
  },
});
