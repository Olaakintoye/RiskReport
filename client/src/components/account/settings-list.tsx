import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";

interface SettingsListProps {
  userId: number;
}

interface Preferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  autoRenew: boolean;
}

export default function SettingsList({ userId }: SettingsListProps) {
  const { data: preferences, isLoading } = useQuery<Preferences>({
    queryKey: [`/api/users/${userId}/preferences`],
  });
  
  const { toast } = useToast();
  
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<Preferences>) => {
      const res = await apiRequest('PATCH', `/api/users/${userId}/preferences`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/preferences`] });
      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    }
  });
  
  const handleToggle = (field: keyof Preferences, value: boolean) => {
    updatePreferencesMutation.mutate({ [field]: value });
  };
  
  const handleFakeLink = () => {
    toast({
      title: "Coming Soon",
      description: "This feature will be available in a future update.",
      variant: "default",
    });
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Account Management */}
        <View style={styles.section}>
          <View style={styles.loadingSectionTitle} />
          <View style={styles.loadingList}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.loadingItem}>
                <View style={styles.loadingItemContent}>
                  <View style={styles.loadingIcon} />
                  <View style={styles.loadingText} />
                </View>
                <View style={styles.loadingToggle} />
              </View>
            ))}
          </View>
        </View>
        
        {/* Preferences */}
        <View style={styles.section}>
          <View style={styles.loadingSectionTitle} />
          <View style={styles.loadingList}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={styles.loadingItem}>
                <View style={styles.loadingItemContent}>
                  <View style={styles.loadingIcon} />
                  <View style={styles.loadingText} />
                </View>
                <View style={styles.loadingToggle} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }
  
  if (!preferences) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      {/* Account Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Management</Text>
        <View style={styles.list}>
          <TouchableOpacity style={styles.item} onPress={handleFakeLink}>
            <View style={styles.itemContent}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>🔒</Text>
              </View>
              <Text style={styles.itemText}>Change Password</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.item} onPress={handleFakeLink}>
            <View style={styles.itemContent}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>📧</Text>
              </View>
              <Text style={styles.itemText}>Update Email</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.item} onPress={handleFakeLink}>
            <View style={styles.itemContent}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>📱</Text>
              </View>
              <Text style={styles.itemText}>Update Phone</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.item} onPress={handleFakeLink}>
            <View style={styles.itemContent}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>🚫</Text>
              </View>
              <Text style={styles.itemText}>Delete Account</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.list}>
          <View style={styles.item}>
            <View style={styles.itemContent}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>📧</Text>
              </View>
              <Text style={styles.itemText}>Email Notifications</Text>
            </View>
            <Switch
              value={preferences.emailNotifications}
              onValueChange={(value) => handleToggle('emailNotifications', value)}
            />
          </View>
          
          <View style={styles.item}>
            <View style={styles.itemContent}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>🔔</Text>
              </View>
              <Text style={styles.itemText}>Push Notifications</Text>
            </View>
            <Switch
              value={preferences.pushNotifications}
              onValueChange={(value) => handleToggle('pushNotifications', value)}
            />
          </View>
          
          <View style={styles.item}>
            <View style={styles.itemContent}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>🔄</Text>
              </View>
              <Text style={styles.itemText}>Auto-Renew CDs</Text>
            </View>
            <Switch
              value={preferences.autoRenew}
              onValueChange={(value) => handleToggle('autoRenew', value)}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  list: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
  },
  itemText: {
    fontSize: 16,
    color: '#000',
  },
  arrow: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    gap: 24,
  },
  loadingSectionTitle: {
    height: 24,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    width: 160,
  },
  loadingList: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  loadingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  loadingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E5E5E5',
    marginRight: 12,
  },
  loadingText: {
    height: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    width: 128,
  },
  loadingToggle: {
    width: 48,
    height: 24,
    backgroundColor: '#E5E5E5',
    borderRadius: 12,
  },
});
