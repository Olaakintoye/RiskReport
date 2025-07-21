import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, DimensionValue } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  onPress?: () => void;
  isLoading?: boolean;
  isActive?: boolean;
  width?: DimensionValue;
}

/**
 * A reusable card component for displaying financial metrics
 */
const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon,
  color = '#334155',
  onPress,
  isLoading = false,
  isActive = false,
  width = '31%' 
}) => {
  return (
    <TouchableOpacity 
      style={[
        styles.metricCard, 
        { width },
        isActive && styles.activeCard
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress || isLoading}
    >
      <View style={styles.headerRow}>
        {icon && (
          <MaterialCommunityIcons 
            name={icon} 
            size={16} 
            color={color} 
            style={styles.icon} 
          />
        )}
        <Text style={[styles.metricTitle, isActive && styles.activeTitle]}>{title}</Text>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingPlaceholder} />
      ) : (
        <>
          <Text style={[styles.metricValue, { color }]}>{value}</Text>
          {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  metricCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  activeCard: {
    backgroundColor: '#f1f5f9',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 4,
  },
  metricTitle: {
    fontSize: 12,
    color: '#64748b',
  },
  activeTitle: {
    fontWeight: '500',
    color: '#334155',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  loadingPlaceholder: {
    height: 16,
    width: '80%',
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 8,
  },
});

export default MetricCard; 