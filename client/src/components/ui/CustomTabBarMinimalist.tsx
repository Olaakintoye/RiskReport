import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface TabBarIconProps {
  route: string;
  focused: boolean;
  size: number;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ route, focused, size }) => {
  const iconColor = focused ? '#000000' : '#000000';
  let iconName: keyof typeof Feather.glyphMap;

  switch (route) {
    case 'Home':
      iconName = 'smile';
      break;
    case 'Portfolio':
      iconName = 'sun';
      break;
    case 'Risk':
      iconName = 'star';
      break;
    case 'Stress Test':
      iconName = 'activity';
      break;
    case 'Profile':
      iconName = 'user';
      break;
    default:
      iconName = 'help-circle';
      break;
  }

  return <Feather name={iconName} size={size} color={iconColor} />;
};

export const CustomTabBarMinimalist: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isCreateTab = route.name === 'Create';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        if (isCreateTab) {
          // Special styling for the center Create button
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.createButton}
            >
              <View style={styles.createButtonInner}>
                <Feather name="star" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          );
        }

        // Regular tab items
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <TabBarIcon route={route.name} focused={isFocused} size={24} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FAFAF8',
    elevation: 0,
    shadowOpacity: 0,
    height: 60,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#00FFAA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
});
