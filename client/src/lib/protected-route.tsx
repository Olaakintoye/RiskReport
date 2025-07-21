import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from "@/contexts/auth-context";
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation-types';

interface ProtectedScreenProps {
  component: React.ComponentType;
}

export function ProtectedScreen({ component: Component }: ProtectedScreenProps) {
  const { user, loading } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  React.useEffect(() => {
    if (!loading && !user) {
      navigation.navigate('Auth');
    }
  }, [user, loading, navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return <Component />;
}