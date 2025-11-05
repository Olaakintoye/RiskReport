import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface TabBarIconProps {
  route: string;
  focused: boolean;
  size: number;
}

interface BadgeProps {
  value: number;
  backgroundColor: string;
  textColor: string;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ route, focused, size }) => {
  const iconColor = focused ? '#000000' : '#4A4A4A';
  let iconName: keyof typeof Ionicons.glyphMap;

  switch (route) {
    case 'Home':
      iconName = focused ? 'home' : 'home-outline';
      break;
    case 'Portfolio':
      iconName = focused ? 'git-network' : 'git-network-outline';
      break;
    case 'Risk':
      iconName = focused ? 'add-circle' : 'add';
      break;
    case 'Stress Test':
      iconName = focused ? 'pulse' : 'pulse-outline';
      break;
    case 'Profile':
      iconName = focused ? 'person' : 'person-outline';
      break;
    default:
      iconName = 'help-circle-outline';
      break;
  }

  return <Ionicons name={iconName} size={size} color={iconColor} />;
};

const Badge: React.FC<BadgeProps> = ({ value, backgroundColor, textColor }) => {
  if (value <= 0) return null;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>
        {value > 99 ? '99+' : value.toString()}
      </Text>
    </View>
  );
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = typeof options.tabBarLabel === 'string' 
          ? options.tabBarLabel 
          : options.title !== undefined 
          ? options.title 
          : route.name;

        const isFocused = state.index === index;

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

        // Show badge only for Profile tab (if needed)
        const showBadge = route.name === 'Profile';
        const badgeValue = 0; // This can be made dynamic later - set to 0 to hide for now

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <View style={styles.iconContainer}>
              <TabBarIcon route={route.name} focused={isFocused} size={24} />
              {showBadge && (
                <Badge 
                  value={badgeValue} 
                  backgroundColor="#FF3B30" 
                  textColor="#FFFFFF" 
                />
              )}
            </View>
            <Text style={[
              styles.label,
              { 
                color: isFocused ? '#000000' : '#4A4A4A',
                fontWeight: isFocused ? '600' : 'normal'
              }
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E5E5',
    borderTopWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 56, // iOS standard height with labels
    paddingHorizontal: 16, // iOS standard side margin
    paddingTop: 8, // iOS standard top padding
    paddingBottom: 8, // iOS standard bottom padding with safe area
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4, // Additional internal padding
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6, // iOS standard spacing between icon and text
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 0, // No bottom margin, spacing handled by iconContainer
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});